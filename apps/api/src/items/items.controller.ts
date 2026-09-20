import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ItemsService } from './items.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { CreateUnitConversionDto } from './dto/create-unit-conversion.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('categories')
  findAllCategories() {
    return this.itemsService.findAllCategories();
  }

  @Post('categories')
  @Roles(Role.ADMIN, Role.MANAGER)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.createCategory(dto, actor.userId);
  }

  @Get('units')
  findAllUnits() {
    return this.itemsService.findAllUnits();
  }

  @Post('units')
  @Roles(Role.ADMIN, Role.MANAGER)
  createUnit(
    @Body() dto: CreateUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.createUnit(dto, actor.userId);
  }

  @Post('conversions')
  @Roles(Role.ADMIN, Role.MANAGER)
  createConversion(
    @Body() dto: CreateUnitConversionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.createUnitConversion(dto, actor.userId);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(
    @Body() dto: CreateItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.create(dto, actor.userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.update(id, dto, actor.userId);
  }

  @Post(':id/prices')
  @Roles(Role.ADMIN, Role.MANAGER)
  setPrice(
    @Param('id') id: string,
    @Body() dto: SetPriceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.itemsService.setPrice(id, dto, actor.userId);
  }

  @Get(':id/price-at-date')
  getPriceAtDate(
    @Param('id') id: string,
    @Query('date') dateString?: string,
  ) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.itemsService.getPriceAtDate(id, date);
  }
}
