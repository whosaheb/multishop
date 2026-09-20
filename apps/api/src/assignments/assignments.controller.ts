import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AssignmentsService } from './assignments.service';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('employee/:employeeId/current')
  @Roles(Role.ADMIN, Role.MANAGER)
  getCurrent(@Param('employeeId') employeeId: string) {
    return this.assignmentsService.getCurrentAssignment(employeeId);
  }

  @Get('employee/:employeeId/history')
  @Roles(Role.ADMIN, Role.MANAGER)
  getHistory(@Param('employeeId') employeeId: string) {
    return this.assignmentsService.getHistory(employeeId);
  }

  /** Only Admin changes assignments, per spec ("Admin can change an employee's assignment"). */
  @Post()
  @Roles(Role.ADMIN)
  reassign(@Body() dto: AssignEmployeeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignmentsService.reassign(dto, actor.userId);
  }
}
