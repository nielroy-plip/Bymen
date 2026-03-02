import { ConfigService } from '@nestjs/config';
import { BlingService } from '../src/integrations/bling/bling.service';

describe('BlingService integration config', () => {
  it('deve expor health check com ambiente homolog', async () => {
    const config = {
      BLING_ENV: 'homolog',
      BLING_BASE_URL_HOMOLOG: 'https://www.bling.com.br/Api/v3',
      BLING_API_KEY_HOMOLOG: 'test_key',
      BLING_RETRY_MAX: '1',
      BLING_RETRY_BASE_MS: '1',
      BLING_TIMEOUT_MS: '1000',
      BLING_RATE_LIMIT_RPS: '5',
    } as Record<string, string>;

    const configService = {
      get: (key: string) => config[key],
    } as unknown as ConfigService;

    const prismaMock = {
      integrationLog: { create: jest.fn() },
      integrationDeadLetter: { create: jest.fn() },
      client: { findUnique: jest.fn(), update: jest.fn() },
      product: { findUnique: jest.fn() },
      medicao: { findUnique: jest.fn(), update: jest.fn() },
    } as any;

    const service = new BlingService(configService, prismaMock);
    const health = await service.healthCheck();

    expect(health.environment).toBe('homolog');
    expect(health.configured).toBe(true);
  });
});
