import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';

/**
 * Global module: PrismaService is injectable anywhere without re-importing.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}
