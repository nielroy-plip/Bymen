import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logDatabaseTarget();
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private logDatabaseTarget() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      this.logger.warn('DATABASE_URL não definida no runtime');
      return;
    }

    try {
      const parsed = new URL(databaseUrl);
      const usingPooler = parsed.hostname.includes('pooler.supabase.com');
      const sslMode = parsed.searchParams.get('sslmode') ?? 'ausente';
      const hasPgbouncer = parsed.searchParams.get('pgbouncer') ?? 'ausente';

      this.logger.log(
        `Conectando no banco host=${parsed.hostname} port=${parsed.port || 'default'} pooler=${usingPooler} sslmode=${sslMode} pgbouncer=${hasPgbouncer}`,
      );
    } catch {
      this.logger.warn('DATABASE_URL inválida (falha ao parsear URL)');
    }
  }
}
