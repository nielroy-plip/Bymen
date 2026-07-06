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
    let databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      this.logger.warn('DATABASE_URL não definida no runtime');
      return;
    }

    databaseUrl = String(databaseUrl).trim();
    // Remove aspas simples/duplas acidentalmente incluídas na variável de ambiente
    if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) || (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
      databaseUrl = databaseUrl.slice(1, -1);
    }

    try {
      const parsed = new URL(databaseUrl);
      const usingPooler = parsed.hostname.includes('pooler.supabase.com');
      const sslMode = parsed.searchParams.get('sslmode') ?? 'ausente';
      const hasPgbouncer = parsed.searchParams.get('pgbouncer') ?? 'ausente';

      this.logger.log(
        `Conectando no banco host=${parsed.hostname} port=${parsed.port || 'default'} pooler=${usingPooler} sslmode=${sslMode} pgbouncer=${hasPgbouncer}`,
      );
    } catch (e) {
      // Redige a senha antes de logar o valor bruto para evitar exposição de segredos
      let redacted = databaseUrl;
      try {
        redacted = databaseUrl.replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:***@');
      } catch {}
      this.logger.warn(`DATABASE_URL inválida (falha ao parsear URL). Valor aproximado: ${redacted}`);
    }
  }
}
