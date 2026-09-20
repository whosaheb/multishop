import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  Role,
  SequenceEventStatus,
  SequenceEventType,
} from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResolveSequenceEventDto } from './dto/resolve-sequence-event.dto';

@Injectable()
export class BillSequenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getActivePadForShop(shopId: string) {
    let pad = await this.prisma.billPad.findFirst({
      where: { shopId, closedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!pad) {
      pad = await this.prisma.billPad.create({
        data: {
          shopId,
          label: `Initial Pad (${new Date().toLocaleDateString()})`,
        },
      });
    }

    return pad;
  }

  async openNewPad(shopId: string, label: string | undefined, actingUserId: string) {
    // Close any open pads for this shop
    await this.prisma.billPad.updateMany({
      where: { shopId, closedAt: null },
      data: { closedAt: new Date() },
    });

    const newPad = await this.prisma.billPad.create({
      data: {
        shopId,
        label: label || `New Pad (${new Date().toLocaleDateString()})`,
        startedAt: new Date(),
      },
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'BILL_PAD_OPENED',
      entityType: 'BillPad',
      entityId: newPad.id,
      afterData: newPad,
    });

    return newPad;
  }

  async checkAndRecordSequence(shopId: string, billId: string, billNumber: number) {
    const pad = await this.getActivePadForShop(shopId);

    // Get the previous bills on this pad
    const highestBill = await this.prisma.bill.findFirst({
      where: { billPadId: pad.id, id: { not: billId } },
      orderBy: { billNumber: 'desc' },
    });

    if (!highestBill) {
      return { pad, event: null };
    }

    const previousNumber = highestBill.billNumber;
    let eventType: SequenceEventType | null = null;
    let details = '';

    if (billNumber <= previousNumber) {
      eventType = SequenceEventType.OUT_OF_ORDER;
      details = `Bill #${billNumber} was submitted, but previous highest bill on this pad was #${previousNumber}.`;
    } else if (billNumber > previousNumber + 1) {
      eventType = SequenceEventType.MISSING_NUMBER;
      const missing = billNumber - 1 === previousNumber + 1
        ? `#${previousNumber + 1}`
        : `#${previousNumber + 1} to #${billNumber - 1}`;
      details = `Missing bill number(s) detected: ${missing}. Current bill is #${billNumber}, previous was #${previousNumber}.`;
    }

    if (eventType) {
      const event = await this.prisma.billSequenceEvent.create({
        data: {
          billPadId: pad.id,
          billId,
          type: eventType,
          details,
          status: SequenceEventStatus.OPEN,
        },
      });

      const notifType =
        eventType === SequenceEventType.MISSING_NUMBER
          ? NotificationType.MISSING_BILL_NUMBER
          : NotificationType.BILL_SEQUENCE_MISMATCH;

      await this.notifications.notifyRoles(
        [Role.ADMIN, Role.MANAGER],
        notifType,
        `Bill Sequence Alert (${eventType})`,
        details,
        'BillSequenceEvent',
        event.id,
      );

      return { pad, event };
    }

    return { pad, event: null };
  }

  async findAllEvents(shopId?: string) {
    return this.prisma.billSequenceEvent.findMany({
      where: shopId ? { billPad: { shopId } } : undefined,
      include: {
        billPad: { include: { shop: true } },
        bill: { include: { createdBy: true } },
        resolvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveEvent(
    id: string,
    dto: ResolveSequenceEventDto,
    actingUserId: string,
  ) {
    const event = await this.prisma.billSequenceEvent.findUnique({
      where: { id },
      include: { billPad: true },
    });
    if (!event) throw new NotFoundException('Sequence event not found');

    if (dto.openNewPad) {
      await this.openNewPad(event.billPad.shopId, dto.newPadLabel, actingUserId);
    }

    const updated = await this.prisma.billSequenceEvent.update({
      where: { id },
      data: {
        status: dto.status,
        details: `${event.details} | Resolution: ${dto.resolutionNotes}`,
        resolvedById: actingUserId,
        resolvedAt: new Date(),
      },
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'BILL_SEQUENCE_RESOLVED',
      entityType: 'BillSequenceEvent',
      entityId: id,
      afterData: updated,
    });

    return updated;
  }
}
