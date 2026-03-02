import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlingModule } from './integrations/bling/bling.module';
import { InventoryService } from './inventory/inventory.service';
import { MedicaoService } from './medicao/medicao.service';
import { DatabaseService } from './database/database.service';
import { DatabasePrismaService } from './database/database.prisma.service';
import { PrismaService } from './database/prisma.service';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { HomologModule } from './homolog/homolog.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), BlingModule, HomologModule],
  providers: [
    PrismaService,
    AuditMiddleware,
    InventoryService,
    MedicaoService,
    {
      provide: DatabaseService,
      useClass: DatabasePrismaService,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
