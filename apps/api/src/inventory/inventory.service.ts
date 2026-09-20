import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Current stock is ALWAYS derived by summing InventoryTransaction.quantityChange.
   * It is never stored as a running total.
   */
  async getDerivedStock(shopId?: string, itemId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (itemId) where.itemId = itemId;

    const [items, shops, transactions] = await Promise.all([
      this.prisma.item.findMany({
        include: { baseUnit: true, sellingUnit: true, category: true },
        where: { isActive: true },
      }),
      this.prisma.shop.findMany({
        where: shopId ? { id: shopId } : undefined,
      }),
      this.prisma.inventoryTransaction.groupBy({
        by: ['shopId', 'itemId'],
        where,
        _sum: { quantityChange: true },
      }),
    ]);

    const stockMap = new Map<string, number>();
    for (const t of transactions) {
      stockMap.set(`${t.shopId}_${t.itemId}`, Number(t._sum.quantityChange ?? 0));
    }

    const result = [];
    for (const shop of shops) {
      for (const item of items) {
        if (itemId && item.id !== itemId) continue;
        const currentStock = stockMap.get(`${shop.id}_${item.id}`) ?? 0;
        result.push({
          shopId: shop.id,
          shopName: shop.name,
          itemId: item.id,
          itemName: item.name,
          categoryName: item.category?.name ?? 'Uncategorized',
          baseUnit: item.baseUnit.symbol || item.baseUnit.name,
          sellingUnit: item.sellingUnit.symbol || item.sellingUnit.name,
          currentStock,
        });
      }
    }

    return result;
  }

  async getStockForItem(shopId: string, itemId: string): Promise<number> {
    const aggregate = await this.prisma.inventoryTransaction.aggregate({
      where: { shopId, itemId },
      _sum: { quantityChange: true },
    });
    return Number(aggregate._sum.quantityChange ?? 0);
  }

  async receiveStock(dto: ReceiveStockDto, actingUserId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: dto.itemId },
      include: { baseUnit: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const txn = await this.prisma.inventoryTransaction.create({
      data: {
        shopId: dto.shopId,
        itemId: dto.itemId,
        type: InventoryTransactionType.RECEIVE,
        quantityChange: dto.quantity,
        performedById: actingUserId,
        note: dto.note || `Received ${dto.quantity} ${item.baseUnit.symbol}`,
      },
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'STOCK_RECEIVED',
      entityType: 'InventoryTransaction',
      entityId: txn.id,
      afterData: txn,
    });

    return txn;
  }

  async transferStock(dto: CreateTransferDto, actingUserId: string) {
    if (dto.fromShopId === dto.toShopId) {
      throw new BadRequestException('Source and destination shops must be different');
    }

    const item = await this.prisma.item.findUnique({
      where: { id: dto.itemId },
      include: { baseUnit: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const [fromShop, toShop] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: dto.fromShopId } }),
      this.prisma.shop.findUnique({ where: { id: dto.toShopId } }),
    ]);
    if (!fromShop || !toShop) throw new NotFoundException('Shop not found');

    const transfer = await this.prisma.$transaction(async (tx: any) => {
      const createdTransfer = await tx.stockTransfer.create({
        data: {
          fromShopId: dto.fromShopId,
          toShopId: dto.toShopId,
          itemId: dto.itemId,
          quantity: dto.quantity,
          reason: dto.reason,
          performedById: actingUserId,
        },
      });

      // TRANSFER_OUT from source shop
      await tx.inventoryTransaction.create({
        data: {
          shopId: dto.fromShopId,
          itemId: dto.itemId,
          type: InventoryTransactionType.TRANSFER_OUT,
          quantityChange: -dto.quantity,
          stockTransferId: createdTransfer.id,
          performedById: actingUserId,
          note: `Transfer to ${toShop.name}`,
        },
      });

      // TRANSFER_IN to destination shop
      await tx.inventoryTransaction.create({
        data: {
          shopId: dto.toShopId,
          itemId: dto.itemId,
          type: InventoryTransactionType.TRANSFER_IN,
          quantityChange: dto.quantity,
          stockTransferId: createdTransfer.id,
          performedById: actingUserId,
          note: `Transfer from ${fromShop.name}`,
        },
      });

      return createdTransfer;
    });

    // Check if source shop went negative
    const sourceStock = await this.getStockForItem(dto.fromShopId, dto.itemId);
    if (sourceStock < 0) {
      await this.notifications.notifyRoles(
        [Role.ADMIN, Role.MANAGER],
        NotificationType.NEGATIVE_STOCK,
        'Negative Stock After Transfer',
        `Item "${item.name}" stock in ${fromShop.name} is negative (${sourceStock} ${item.baseUnit.symbol}) after transfer.`,
        'Item',
        item.id,
      );
    }

    await this.audit.record({
      userId: actingUserId,
      action: 'STOCK_TRANSFERRED',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      afterData: transfer,
    });

    return transfer;
  }

  async adjustStock(dto: CreateAdjustmentDto, actingUserId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: dto.itemId },
      include: { baseUnit: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const systemStock = await this.getStockForItem(dto.shopId, dto.itemId);
    const quantityDelta = dto.physicalStock - systemStock;

    const adjustment = await this.prisma.$transaction(async (tx: any) => {
      const createdAdjustment = await tx.stockAdjustment.create({
        data: {
          shopId: dto.shopId,
          itemId: dto.itemId,
          systemStock,
          physicalStock: dto.physicalStock,
          quantityDelta,
          reason: dto.reason,
          performedById: actingUserId,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          shopId: dto.shopId,
          itemId: dto.itemId,
          type: InventoryTransactionType.ADJUSTMENT,
          quantityChange: quantityDelta,
          stockAdjustmentId: createdAdjustment.id,
          performedById: actingUserId,
          note: `Physical count adjustment: ${dto.reason}`,
        },
      });

      return createdAdjustment;
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'STOCK_ADJUSTED',
      entityType: 'StockAdjustment',
      entityId: adjustment.id,
      afterData: adjustment,
    });

    return adjustment;
  }

  async getTransactions(shopId?: string, itemId?: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        shopId: shopId || undefined,
        itemId: itemId || undefined,
      },
      include: {
        shop: true,
        item: { include: { baseUnit: true } },
        performedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
