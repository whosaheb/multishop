import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { CreateUnitConversionDto } from './dto/create-unit-conversion.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { SetPriceDto } from './dto/set-price.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ================= Categories =================
  async findAllCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto, actingUserId: string) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A category with this name already exists');

    const category = await this.prisma.category.create({ data: dto });
    await this.audit.record({
      userId: actingUserId,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      afterData: category,
    });
    return category;
  }

  // ================= Units =================
  async findAllUnits() {
    return this.prisma.unit.findMany({
      include: { conversionsFrom: true, conversionsTo: true },
      orderBy: { name: 'asc' },
    });
  }

  async createUnit(dto: CreateUnitDto, actingUserId: string) {
    const existing = await this.prisma.unit.findFirst({
      where: { OR: [{ name: dto.name }, { symbol: dto.symbol }] },
    });
    if (existing) throw new ConflictException('A unit with this name or symbol already exists');

    const unit = await this.prisma.unit.create({ data: dto });
    await this.audit.record({
      userId: actingUserId,
      action: 'UNIT_CREATED',
      entityType: 'Unit',
      entityId: unit.id,
      afterData: unit,
    });
    return unit;
  }

  async createUnitConversion(dto: CreateUnitConversionDto, actingUserId: string) {
    const existing = await this.prisma.unitConversion.findUnique({
      where: {
        fromUnitId_toUnitId: {
          fromUnitId: dto.fromUnitId,
          toUnitId: dto.toUnitId,
        },
      },
    });
    if (existing) throw new ConflictException('This unit conversion already exists');

    const conversion = await this.prisma.unitConversion.create({ data: dto });
    await this.audit.record({
      userId: actingUserId,
      action: 'UNIT_CONVERSION_CREATED',
      entityType: 'UnitConversion',
      entityId: conversion.id,
      afterData: conversion,
    });
    return conversion;
  }

  // ================= Items =================
  async findAll() {
    return this.prisma.item.findMany({
      include: {
        category: true,
        baseUnit: true,
        sellingUnit: true,
        prices: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        baseUnit: true,
        sellingUnit: true,
        prices: { orderBy: { effectiveDate: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async create(dto: CreateItemDto, actingUserId: string) {
    const existing = await this.prisma.item.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('An item with this name already exists');

    const item = await this.prisma.$transaction(async (tx: any) => {
      const createdItem = await tx.item.create({
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          baseUnitId: dto.baseUnitId,
          sellingUnitId: dto.sellingUnitId,
        },
      });

      await tx.itemPrice.create({
        data: {
          itemId: createdItem.id,
          pricePerUnit: dto.initialPrice,
          effectiveDate: new Date(),
          setById: actingUserId,
        },
      });

      return createdItem;
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'ITEM_CREATED',
      entityType: 'Item',
      entityId: item.id,
      afterData: item,
    });

    return this.findOne(item.id);
  }

  async update(id: string, dto: UpdateItemDto, actingUserId: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.item.update({
      where: { id },
      data: dto,
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'ITEM_UPDATED',
      entityType: 'Item',
      entityId: id,
      beforeData: before,
      afterData: updated,
    });

    return this.findOne(id);
  }

  // ================= Date-Effective Pricing =================
  async setPrice(itemId: string, dto: SetPriceDto, actingUserId: string) {
    await this.findOne(itemId);

    const price = await this.prisma.itemPrice.create({
      data: {
        itemId,
        pricePerUnit: dto.pricePerUnit,
        effectiveDate: new Date(dto.effectiveDate),
        setById: actingUserId,
      },
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'PRICE_CHANGED',
      entityType: 'ItemPrice',
      entityId: price.id,
      afterData: price,
    });

    return price;
  }

  async getPriceAtDate(itemId: string, date: Date = new Date()) {
    const priceRow = await this.prisma.itemPrice.findFirst({
      where: {
        itemId,
        effectiveDate: { lte: date },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!priceRow) {
      throw new NotFoundException(`No effective price found for item ${itemId} at ${date.toISOString()}`);
    }
    return priceRow;
  }
}
