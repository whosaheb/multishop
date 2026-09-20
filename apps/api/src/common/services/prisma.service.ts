import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[AI Studio] Database not connected — using fallback');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
