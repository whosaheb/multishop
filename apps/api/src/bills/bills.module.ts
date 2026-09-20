import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillSequenceModule } from '../bill-sequence/bill-sequence.module';
import { ItemsModule } from '../items/items.module';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';

@Module({
  imports: [AuditModule, NotificationsModule, BillSequenceModule, ItemsModule],
  providers: [BillsService],
  controllers: [BillsController],
  exports: [BillsService],
})
export class BillsModule {}
