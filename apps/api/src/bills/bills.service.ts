import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillReviewDecision,
  BillStatus,
  InventoryTransactionType,
  ModificationRequestStatus,
  NotificationType,
  PaymentMethod,
  Role,
} from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillSequenceService } from '../bill-sequence/bill-sequence.service';
import { ItemsService } from '../items/items.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CreateBillReviewDto } from './dto/create-bill-review.dto';
import { CreateModificationRequestDto } from './dto/create-modification-request.dto';
import { ResolveModificationRequestDto } from './dto/resolve-modification-request.dto';

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly sequenceService: BillSequenceService,
    private readonly itemsService: ItemsService,
  ) {}

  private async calculateBaseQuantity(
    itemId: string,
    quantity: number,
  ): Promise<number> {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { baseUnit: true, sellingUnit: true },
    });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);

    if (item.baseUnitId === item.sellingUnitId) {
      return quantity;
    }

    // Check direct unit conversion
    const conversion = await this.prisma.unitConversion.findUnique({
      where: {
        fromUnitId_toUnitId: {
          fromUnitId: item.sellingUnitId,
          toUnitId: item.baseUnitId,
        },
      },
    });

    if (conversion) {
      return quantity * Number(conversion.factor);
    }

    // Fall back to canonical conversion factors
    const sellingFactor = Number(item.sellingUnit.toCanonicalFactor);
    const baseFactor = Number(item.baseUnit.toCanonicalFactor);
    if (baseFactor > 0) {
      return quantity * (sellingFactor / baseFactor);
    }

    return quantity;
  }

  async create(dto: CreateBillDto, actingUserId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A bill must contain at least one item');
    }

    const billDate = dto.billDate ? new Date(dto.billDate) : new Date();
    const pad = await this.sequenceService.getActivePadForShop(dto.shopId);

    // Check for existing bill with same number on this pad
    const existing = await this.prisma.bill.findUnique({
      where: {
        shopId_billPadId_billNumber: {
          shopId: dto.shopId,
          billPadId: pad.id,
          billNumber: dto.billNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Bill #${dto.billNumber} already exists in this shop on the current pad`,
      );
    }

    // Resolve prices and prepare line items
    let calculatedTotal = 0;
    const resolvedItems = [];

    for (const itemInput of dto.items) {
      const item = await this.prisma.item.findUnique({
        where: { id: itemInput.itemId },
        include: { baseUnit: true, sellingUnit: true },
      });
      if (!item) throw new NotFoundException(`Item ${itemInput.itemId} not found`);

      const priceRow = await this.itemsService.getPriceAtDate(item.id, billDate);
      const pricePerUnit = Number(priceRow.pricePerUnit);
      const lineAmount = itemInput.quantity * pricePerUnit;
      calculatedTotal += lineAmount;

      const baseQuantity = await this.calculateBaseQuantity(item.id, itemInput.quantity);

      resolvedItems.push({
        item,
        quantity: itemInput.quantity,
        unitLabel: item.sellingUnit.symbol || item.sellingUnit.name,
        pricePerUnit,
        lineAmount,
        baseQuantity,
      });
    }

    const discountAmount = calculatedTotal - dto.actualAmount;
    const discountPercent =
      calculatedTotal > 0 ? (discountAmount / calculatedTotal) * 100 : 0;

    // Database transaction to create the Bill, BillItems, BillVersion, Attachment & Inventory Transactions
    const bill = await this.prisma.$transaction(async (tx: any) => {
      let attachmentId: string | undefined;

      if (dto.attachment) {
        const attachment = await tx.billAttachment.create({
          data: {
            objectKey: dto.attachment.objectKey,
            mimeType: dto.attachment.mimeType,
            sizeBytes: dto.attachment.sizeBytes,
            hash: dto.attachment.hash,
            uploadedById: actingUserId,
          },
        });
        attachmentId = attachment.id;
      }

      const createdBill = await tx.bill.create({
        data: {
          shopId: dto.shopId,
          createdById: actingUserId,
          billNumber: dto.billNumber,
          billPadId: pad.id,
          billDate,
          status: BillStatus.SUBMITTED,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerAddress: dto.customerAddress,
          calculatedAmount: calculatedTotal,
          actualAmount: dto.actualAmount,
          discountAmount,
          discountPercent,
          attachmentId,
          currentVersionNo: 1,
        },
      });

      // Insert BillItems
      for (const item of resolvedItems) {
        await tx.billItem.create({
          data: {
            billId: createdBill.id,
            itemId: item.item.id,
            quantity: item.quantity,
            unitLabel: item.unitLabel,
            pricePerUnit: item.pricePerUnit,
            lineAmount: item.lineAmount,
            baseQuantity: item.baseQuantity,
          },
        });
      }

      // Insert BillVersion 1
      const version = await tx.billVersion.create({
        data: {
          billId: createdBill.id,
          versionNumber: 1,
          authoredById: actingUserId,
          reason: 'Initial bill creation',
          billDate,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerAddress: dto.customerAddress,
          calculatedAmount: calculatedTotal,
          actualAmount: dto.actualAmount,
          discountAmount,
        },
      });

      for (const item of resolvedItems) {
        await tx.billVersionItem.create({
          data: {
            billVersionId: version.id,
            itemId: item.item.id,
            quantity: item.quantity,
            unitLabel: item.unitLabel,
            pricePerUnit: item.pricePerUnit,
            lineAmount: item.lineAmount,
            baseQuantity: item.baseQuantity,
          },
        });
      }

      // Post BILL_SALE inventory transaction per line item (negative movement in base unit)
      for (const item of resolvedItems) {
        await tx.inventoryTransaction.create({
          data: {
            shopId: dto.shopId,
            itemId: item.item.id,
            type: InventoryTransactionType.BILL_SALE,
            quantityChange: -item.baseQuantity,
            billId: createdBill.id,
            performedById: actingUserId,
            note: `Bill #${dto.billNumber} sale`,
          },
        });
      }

      return createdBill;
    });

    // Sequence monitoring
    await this.sequenceService.checkAndRecordSequence(
      dto.shopId,
      bill.id,
      dto.billNumber,
    );

    // Notify Managers and Admins of pending bill review
    await this.notifications.notifyRoles(
      [Role.ADMIN, Role.MANAGER],
      NotificationType.PENDING_BILL_REVIEW,
      'New Bill Pending Review',
      `Bill #${bill.billNumber} was submitted for review. Total: ₹${dto.actualAmount}`,
      'Bill',
      bill.id,
    );

    // Check for negative stock on each sold item
    for (const item of resolvedItems) {
      const stockAggregate = await this.prisma.inventoryTransaction.aggregate({
        where: { shopId: dto.shopId, itemId: item.item.id },
        _sum: { quantityChange: true },
      });
      const currentStock = Number(stockAggregate._sum.quantityChange ?? 0);
      if (currentStock < 0) {
        await this.notifications.notifyRoles(
          [Role.ADMIN, Role.MANAGER],
          NotificationType.NEGATIVE_STOCK,
          'Negative Stock Alert',
          `Item "${item.item.name}" is at negative stock (${currentStock} ${item.item.baseUnit.symbol}) in shop.`,
          'Item',
          item.item.id,
        );
      }
    }

    await this.audit.record({
      userId: actingUserId,
      action: 'BILL_CREATED',
      entityType: 'Bill',
      entityId: bill.id,
      afterData: bill,
    });

    return this.findOne(bill.id);
  }

  async findAll(params: {
    shopId?: string;
    status?: BillStatus;
    createdById?: string;
  }) {
    return this.prisma.bill.findMany({
      where: {
        shopId: params.shopId,
        status: params.status,
        createdById: params.createdById,
      },
      include: {
        shop: true,
        createdBy: {
          select: { id: true, fullName: true, mobileNumber: true, role: true },
        },
        items: { include: { item: true } },
        attachment: true,
        reviews: { include: { reviewer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSubmittedQueue(shopId?: string) {
    return this.prisma.bill.findMany({
      where: {
        shopId,
        status: { in: [BillStatus.SUBMITTED, BillStatus.UNDER_REVIEW] },
      },
      include: {
        shop: true,
        createdBy: {
          select: { id: true, fullName: true, mobileNumber: true, role: true },
        },
        items: { include: { item: true } },
        attachment: true,
        modificationRequests: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        shop: true,
        createdBy: {
          select: { id: true, fullName: true, mobileNumber: true, role: true },
        },
        items: { include: { item: true } },
        attachment: true,
        versions: {
          include: { items: { include: { item: true } }, authoredBy: true },
          orderBy: { versionNumber: 'desc' },
        },
        reviews: { include: { reviewer: true }, orderBy: { createdAt: 'desc' } },
        modificationRequests: {
          include: { requestedBy: true, resolvedBy: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async reviewBill(
    billId: string,
    dto: CreateBillReviewDto,
    reviewerUserId: string,
  ) {
    const bill = await this.findOne(billId);

    const newStatus =
      dto.decision === BillReviewDecision.APPROVED
        ? BillStatus.APPROVED
        : BillStatus.DISPUTED;

    const review = await this.prisma.$transaction(async (tx: any) => {
      const createdReview = await tx.billReview.create({
        data: {
          billId,
          reviewerId: reviewerUserId,
          decision: dto.decision,
          reason: dto.reason,
        },
      });

      await tx.bill.update({
        where: { id: billId },
        data: { status: newStatus },
      });

      return createdReview;
    });

    if (dto.decision === BillReviewDecision.DISPUTED) {
      await this.notifications.notifyUser({
        userId: bill.createdById,
        type: NotificationType.BILL_DISPUTED,
        title: 'Bill Disputed',
        message: `Your Bill #${bill.billNumber} was disputed: ${dto.reason || 'Needs review'}`,
        entityType: 'Bill',
        entityId: bill.id,
      });
    }

    await this.audit.record({
      userId: reviewerUserId,
      action: 'BILL_REVIEWED',
      entityType: 'BillReview',
      entityId: review.id,
      afterData: review,
    });

    return this.findOne(billId);
  }

  async requestModification(
    billId: string,
    dto: CreateModificationRequestDto,
    requesterUserId: string,
  ) {
    const bill = await this.findOne(billId);

    const request = await this.prisma.billModificationRequest.create({
      data: {
        billId,
        requestedById: requesterUserId,
        reason: dto.reason,
        status: ModificationRequestStatus.PENDING,
      },
    });

    await this.notifications.notifyRoles(
      [Role.ADMIN, Role.MANAGER],
      NotificationType.MODIFICATION_REQUESTED,
      'Bill Modification Requested',
      `Modification requested for Bill #${bill.billNumber}: ${dto.reason}`,
      'BillModificationRequest',
      request.id,
    );

    await this.audit.record({
      userId: requesterUserId,
      action: 'BILL_MODIFICATION_REQUESTED',
      entityType: 'BillModificationRequest',
      entityId: request.id,
      afterData: request,
    });

    return request;
  }

  async resolveModification(
    requestId: string,
    dto: ResolveModificationRequestDto,
    resolverUserId: string,
  ) {
    const request = await this.prisma.billModificationRequest.findUnique({
      where: { id: requestId },
      include: { bill: { include: { items: true } } },
    });
    if (!request) throw new NotFoundException('Modification request not found');

    if (dto.status === ModificationRequestStatus.DECLINED) {
      const updated = await this.prisma.billModificationRequest.update({
        where: { id: requestId },
        data: {
          status: ModificationRequestStatus.DECLINED,
          resolvedById: resolverUserId,
          resolvedAt: new Date(),
        },
      });
      return updated;
    }

    // Resolve by creating a new immutable BillVersion
    const bill = request.bill;
    const nextVersionNo = bill.currentVersionNo + 1;

    const revisedItemsInput = dto.revisedItems || bill.items.map((i: any) => ({
      itemId: i.itemId,
      quantity: Number(i.quantity),
    }));

    const revisedActual = dto.revisedActualAmount ?? Number(bill.actualAmount);

    let calculatedTotal = 0;
    const resolvedItems = [];

    for (const itemInput of revisedItemsInput) {
      const item = await this.prisma.item.findUnique({
        where: { id: itemInput.itemId },
        include: { baseUnit: true, sellingUnit: true },
      });
      if (!item) throw new NotFoundException(`Item ${itemInput.itemId} not found`);

      const priceRow = await this.itemsService.getPriceAtDate(item.id, bill.billDate);
      const pricePerUnit = Number(priceRow.pricePerUnit);
      const lineAmount = itemInput.quantity * pricePerUnit;
      calculatedTotal += lineAmount;

      const baseQuantity = await this.calculateBaseQuantity(item.id, itemInput.quantity);

      resolvedItems.push({
        item,
        quantity: itemInput.quantity,
        unitLabel: item.sellingUnit.symbol || item.sellingUnit.name,
        pricePerUnit,
        lineAmount,
        baseQuantity,
      });
    }

    const discountAmount = calculatedTotal - revisedActual;
    const discountPercent =
      calculatedTotal > 0 ? (discountAmount / calculatedTotal) * 100 : 0;

    await this.prisma.$transaction(async (tx: any) => {
      // Create new BillVersion (immutable version tracking)
      const version = await tx.billVersion.create({
        data: {
          billId: bill.id,
          versionNumber: nextVersionNo,
          authoredById: resolverUserId,
          reason: dto.resolutionReason,
          billDate: bill.billDate,
          paymentMethod: bill.paymentMethod,
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          customerAddress: bill.customerAddress,
          calculatedAmount: calculatedTotal,
          actualAmount: revisedActual,
          discountAmount,
        },
      });

      for (const item of resolvedItems) {
        await tx.billVersionItem.create({
          data: {
            billVersionId: version.id,
            itemId: item.item.id,
            quantity: item.quantity,
            unitLabel: item.unitLabel,
            pricePerUnit: item.pricePerUnit,
            lineAmount: item.lineAmount,
            baseQuantity: item.baseQuantity,
          },
        });
      }

      // Reconcile inventory: Calculate difference between old bill items and new bill items
      // Post BILL_CORRECTION transactions
      for (const newItem of resolvedItems) {
        const oldItem = bill.items.find((i: any) => i.itemId === newItem.item.id);
        const oldBaseQty = oldItem ? Number(oldItem.baseQuantity) : 0;
        const delta = newItem.baseQuantity - oldBaseQty;

        if (delta !== 0) {
          await tx.inventoryTransaction.create({
            data: {
              shopId: bill.shopId,
              itemId: newItem.item.id,
              type: InventoryTransactionType.BILL_CORRECTION,
              quantityChange: -delta, // more sold = negative change, less sold = positive change
              billId: bill.id,
              performedById: resolverUserId,
              note: `Correction v${nextVersionNo}: ${dto.resolutionReason}`,
            },
          });
        }
      }

      // Update current Bill state to reflect newest authoritative state
      await tx.billItem.deleteMany({ where: { billId: bill.id } });

      for (const item of resolvedItems) {
        await tx.billItem.create({
          data: {
            billId: bill.id,
            itemId: item.item.id,
            quantity: item.quantity,
            unitLabel: item.unitLabel,
            pricePerUnit: item.pricePerUnit,
            lineAmount: item.lineAmount,
            baseQuantity: item.baseQuantity,
          },
        });
      }

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          currentVersionNo: nextVersionNo,
          calculatedAmount: calculatedTotal,
          actualAmount: revisedActual,
          discountAmount,
          discountPercent,
          status: BillStatus.UNDER_REVIEW,
        },
      });

      await tx.billModificationRequest.update({
        where: { id: requestId },
        data: {
          status: ModificationRequestStatus.RESOLVED,
          resolvedById: resolverUserId,
          resolvedAt: new Date(),
          resultingVersionNo: nextVersionNo,
        },
      });
    });

    await this.audit.record({
      userId: resolverUserId,
      action: 'BILL_MODIFICATION_RESOLVED',
      entityType: 'Bill',
      entityId: bill.id,
      afterData: { nextVersionNo, reason: dto.resolutionReason },
    });

    return this.findOne(bill.id);
  }
}
