import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

/**
 * Shops are never hard-deleted (spec: "Shops must never be hard-deleted").
 * Retiring a shop means setting status = INACTIVE, which hides it from new
 * operational activity while keeping all historical data queryable.
 */
@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.shop.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async create(dto: CreateShopDto, actingUserId: string) {
    const existing = await this.prisma.shop.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A shop with this name already exists');

    const shop = await this.prisma.shop.create({ data: dto });

    await this.audit.record({
      userId: actingUserId,
      action: 'SHOP_CREATED',
      entityType: 'Shop',
      entityId: shop.id,
      afterData: shop,
    });

    return shop;
  }

  async update(id: string, dto: UpdateShopDto, actingUserId: string) {
    const before = await this.findOne(id);
    const shop = await this.prisma.shop.update({ where: { id }, data: dto });

    await this.audit.record({
      userId: actingUserId,
      action: 'SHOP_UPDATED',
      entityType: 'Shop',
      entityId: id,
      beforeData: before,
      afterData: shop,
    });

    return shop;
  }
}
