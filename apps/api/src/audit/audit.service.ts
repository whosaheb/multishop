import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
}

/**
 * Central place to write audit trail entries. Every module that mutates
 * business-critical data (prices, bills, inventory, users, shops) should
 * call this instead of writing to AuditLog directly, so the shape of audit
 * records stays consistent.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: input.beforeData as any,
        afterData: input.afterData as any,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }
}
