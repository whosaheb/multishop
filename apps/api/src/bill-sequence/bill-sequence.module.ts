import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillSequenceService } from './bill-sequence.service';
import { BillSequenceController } from './bill-sequence.controller';

@Module({
  imports: [AuditModule, NotificationsModule],
  providers: [BillSequenceService],
  controllers: [BillSequenceController],
  exports: [BillSequenceService],
})
export class BillSequenceModule {}
