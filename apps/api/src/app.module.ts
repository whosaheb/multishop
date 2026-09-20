import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopsModule } from './shops/shops.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ItemsModule } from './items/items.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillSequenceModule } from './bill-sequence/bill-sequence.module';
import { BillsModule } from './bills/bills.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // In-memory rate limiting is sufficient at the initial ~20-user scale
    // (spec: "Initial rate limiting can also use in-memory storage").
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100, // generous default; auth endpoints get a stricter limit below
      },
    ]),
    CommonModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    AssignmentsModule,
    ItemsModule,
    NotificationsModule,
    BillSequenceModule,
    BillsModule,
    InventoryModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
