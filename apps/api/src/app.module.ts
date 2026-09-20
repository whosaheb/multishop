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
    // Phase 2+ modules (items, categories, units, prices, bills,
    // bill-review, bill-versions, bill-attachments, inventory,
    // stock-transfers, stock-adjustments, bill-sequence, notifications,
    // reports) plug in here the same way, following this module's pattern:
    // Prisma via CommonModule, mutations via AuditService, guards via
    // JwtAuthGuard + RolesGuard + @Roles(...).
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
