import { Module } from '@nestjs/common';
import { HomologController } from './homolog.controller';
import { HomologService } from './homolog.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [HomologController],
  providers: [HomologService, PrismaService],
})
export class HomologModule {}
