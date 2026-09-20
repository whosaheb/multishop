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
import { BillSequenceService } from './bill-sequence.service';
import { ResolveSequenceEventDto } from './dto/resolve-sequence-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('bill-sequence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bill-sequence')
export class BillSequenceController {
  constructor(private readonly sequenceService: BillSequenceService) {}

  @Get('events')
  @Roles(Role.ADMIN, Role.MANAGER)
  findAllEvents(@Query('shopId') shopId?: string) {
    return this.sequenceService.findAllEvents(shopId);
  }

  @Get('active-pad/:shopId')
  getActivePad(@Param('shopId') shopId: string) {
    return this.sequenceService.getActivePadForShop(shopId);
  }

  @Post('pads/:shopId/open-new')
  @Roles(Role.ADMIN, Role.MANAGER)
  openNewPad(
    @Param('shopId') shopId: string,
    @Body('label') label: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sequenceService.openNewPad(shopId, label, user.userId);
  }

  @Patch('events/:id/resolve')
  @Roles(Role.ADMIN, Role.MANAGER)
  resolveEvent(
    @Param('id') id: string,
    @Body() dto: ResolveSequenceEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sequenceService.resolveEvent(id, dto, user.userId);
  }
}
