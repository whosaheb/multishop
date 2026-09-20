import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/admin-manager')
  @Roles(Role.ADMIN, Role.MANAGER)
  getAdminManagerDashboard() {
    return this.reportsService.getAdminManagerDashboard();
  }

  @Get('dashboard/employee')
  getEmployeeDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getEmployeeDashboard(user.userId);
  }
}
