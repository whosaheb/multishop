import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  getDerivedStock(
    @Query('shopId') shopId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getDerivedStock(shopId, itemId);
  }

  @Post('receive')
  @Roles(Role.ADMIN, Role.MANAGER)
  receiveStock(
    @Body() dto: ReceiveStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.receiveStock(dto, user.userId);
  }

  @Post('transfer')
  @Roles(Role.ADMIN, Role.MANAGER)
  transferStock(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.transferStock(dto, user.userId);
  }

  @Post('adjustment')
  @Roles(Role.ADMIN, Role.MANAGER)
  adjustStock(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.adjustStock(dto, user.userId);
  }

  @Get('transactions')
  getTransactions(
    @Query('shopId') shopId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getTransactions(shopId, itemId);
  }
}
