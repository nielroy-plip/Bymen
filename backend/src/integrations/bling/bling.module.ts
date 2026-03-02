import { Module } from '@nestjs/common';
import { BlingController } from './bling.controller';
import { BlingService } from './bling.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [BlingController],
  providers: [BlingService, PrismaService],
  exports: [BlingService],
})
export class BlingModule {}
