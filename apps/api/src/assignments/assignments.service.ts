import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssignEmployeeDto } from './dto/assign-employee.dto';

/**
 * An employee is assigned to exactly one shop at a time, but the full
 * history of assignments is preserved (never overwritten) so that
 * historical bills stay attributed to the shop the employee actually
 * belonged to when each bill was created.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The employee's current shop, or null if unassigned. */
  async getCurrentAssignment(employeeId: string) {
    return this.prisma.employeeShopAssignment.findFirst({
      where: { employeeId, endDate: null },
      include: { shop: true },
    });
  }

  async getHistory(employeeId: string) {
    return this.prisma.employeeShopAssignment.findMany({
      where: { employeeId },
      include: { shop: true },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Ends any current assignment and opens a new one, atomically. This is
   * how "Admin changes an employee's assignment" is implemented — old rows
   * are closed with an endDate, never deleted or rewritten.
   */
  async reassign(dto: AssignEmployeeDto, actingUserId: string) {
    const employee = await this.prisma.user.findFirst({
      where: { id: dto.employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.role !== Role.EMPLOYEE) {
      throw new BadRequestException('Only users with role EMPLOYEE can be assigned to a shop');
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.employeeShopAssignment.updateMany({
        where: { employeeId: dto.employeeId, endDate: null },
        data: { endDate: now },
      });

      return tx.employeeShopAssignment.create({
        data: {
          employeeId: dto.employeeId,
          shopId: dto.shopId,
          startDate: now,
        },
        include: { shop: true },
      });
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'EMPLOYEE_REASSIGNED',
      entityType: 'EmployeeShopAssignment',
      entityId: result.id,
      afterData: result,
    });

    return result;
  }
}
