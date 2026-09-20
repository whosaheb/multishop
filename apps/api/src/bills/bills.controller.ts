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
import { BillStatus, Role } from '@prisma/client';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CreateBillReviewDto } from './dto/create-bill-review.dto';
import { CreateModificationRequestDto } from './dto/create-modification-request.dto';
import { ResolveModificationRequestDto } from './dto/resolve-modification-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  create(
    @Body() dto: CreateBillDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billsService.create(dto, user.userId);
  }

  @Get()
  findAll(
    @Query('shopId') shopId?: string,
    @Query('status') status?: BillStatus,
  ) {
    return this.billsService.findAll({ shopId, status });
  }

  @Get('submitted-queue')
  @Roles(Role.ADMIN, Role.MANAGER)
  findSubmittedQueue(@Query('shopId') shopId?: string) {
    return this.billsService.findSubmittedQueue(shopId);
  }

  @Get('my')
  findMyBills(@CurrentUser() user: AuthenticatedUser) {
    return this.billsService.findAll({ createdById: user.userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billsService.findOne(id);
  }

  @Post(':id/review')
  @Roles(Role.ADMIN, Role.MANAGER)
  review(
    @Param('id') id: string,
    @Body() dto: CreateBillReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billsService.reviewBill(id, dto, user.userId);
  }

  @Post(':id/modification-requests')
  requestModification(
    @Param('id') id: string,
    @Body() dto: CreateModificationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billsService.requestModification(id, dto, user.userId);
  }

  @Patch('modification-requests/:id/resolve')
  @Roles(Role.ADMIN, Role.MANAGER)
  resolveModification(
    @Param('id') id: string,
    @Body() dto: ResolveModificationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billsService.resolveModification(id, dto, user.userId);
  }
}
