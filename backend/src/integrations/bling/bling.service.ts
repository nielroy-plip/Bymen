import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Builder, parseStringPromise } from 'xml2js';
import { PrismaService } from '../../database/prisma.service';
import {
  FinalizeMedicaoDto,
  StockCheckDto,
  StockMovementDto,
  SyncClientDto,
} from './dto';

@Injectable()
export class BlingService {
  private readonly logger = new Logger(BlingService.name);
  private readonly http: AxiosInstance;
  private readonly xmlBuilder = new Builder({ headless: true });
  private readonly blingEnv: 'homolog' | 'production';
  private readonly apiKey: string;
  private readonly retryMax: number;
  private readonly retryBaseMs: number;
  private readonly timeoutMs: number;
  private readonly requestsPerSecond: number;
  private lastRequestAt = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.blingEnv = (this.configService.get<string>('BLING_ENV') || 'homolog') as
      | 'homolog'
      | 'production';

    const baseURL =
      this.blingEnv === 'production'
        ? this.configService.get<string>('BLING_BASE_URL_PRODUCTION')
        : this.configService.get<string>('BLING_BASE_URL_HOMOLOG');

    this.apiKey =
      this.blingEnv === 'production'
        ? this.configService.get<string>('BLING_API_KEY_PRODUCTION') || ''
        : this.configService.get<string>('BLING_API_KEY_HOMOLOG') || '';

    this.retryMax = Number(this.configService.get<string>('BLING_RETRY_MAX') || 3);
    this.retryBaseMs = Number(this.configService.get<string>('BLING_RETRY_BASE_MS') || 500);
    this.timeoutMs = Number(this.configService.get<string>('BLING_TIMEOUT_MS') || 12000);
    this.requestsPerSecond = Number(this.configService.get<string>('BLING_RATE_LIMIT_RPS') || 4);

    this.http = axios.create({
      baseURL,
      timeout: this.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async enforceRateLimit() {
    const minInterval = Math.ceil(1000 / this.requestsPerSecond);
    const diff = Date.now() - this.lastRequestAt;
    if (diff < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - diff));
    }
    this.lastRequestAt = Date.now();
  }

  private normalizePayload(payload: unknown): string {
    if (payload == null) {
      return '';
    }
    if (typeof payload === 'string') {
      return payload;
    }
    return JSON.stringify(payload);
  }

  private async toJsonResponse(data: unknown): Promise<unknown> {
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      return parseStringPromise(data, { explicitArray: false, explicitRoot: false });
    }
    return data;
  }

  private async logIntegration(params: {
    endpoint: string;
    method: string;
    requestBody?: string;
    responseBody?: string;
    statusCode?: number;
    success: boolean;
  }) {
    await this.prisma.integrationLog.create({
      data: {
        provider: 'BLING',
        endpoint: params.endpoint,
        method: params.method,
        requestBody: params.requestBody,
        responseBody: params.responseBody,
        statusCode: params.statusCode,
        success: params.success,
        environment: this.blingEnv,
      },
    });
  }

  private async pushDeadLetter(params: {
    endpoint: string;
    method: string;
    requestBody?: string;
    errorMessage: string;
    attempts: number;
  }) {
    await this.prisma.integrationDeadLetter.create({
      data: {
        provider: 'BLING',
        endpoint: params.endpoint,
        method: params.method,
        requestBody: params.requestBody,
        errorMessage: params.errorMessage,
        attempts: params.attempts,
        environment: this.blingEnv,
      },
    });
  }

  private async callBling<T = unknown>(config: AxiosRequestConfig, body?: unknown): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('BLING API key não configurada para o ambiente atual');
    }

    let attempt = 0;
    let lastError: any;

    while (attempt <= this.retryMax) {
      await this.enforceRateLimit();
      try {
        const params = { ...(config.params || {}), apikey: this.apiKey };
        const response = await this.http.request({ ...config, params });
        const parsed = await this.toJsonResponse(response.data);

        await this.logIntegration({
          endpoint: String(config.url || ''),
          method: String(config.method || 'GET').toUpperCase(),
          requestBody: this.normalizePayload(body),
          responseBody: this.normalizePayload(parsed),
          statusCode: response.status,
          success: true,
        });

        return parsed as T;
      } catch (error: any) {
        lastError = error;
        const statusCode = error?.response?.status;
        const responseBody = error?.response?.data;

        await this.logIntegration({
          endpoint: String(config.url || ''),
          method: String(config.method || 'GET').toUpperCase(),
          requestBody: this.normalizePayload(body),
          responseBody: this.normalizePayload(responseBody),
          statusCode,
          success: false,
        });

        if (attempt === this.retryMax) {
          break;
        }

        const backoff = this.retryBaseMs * Math.pow(2, attempt);
        this.logger.warn(`Falha Bling tentativa ${attempt + 1}. Retry em ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
      attempt += 1;
    }

    await this.pushDeadLetter({
      endpoint: String(config.url || ''),
      method: String(config.method || 'GET').toUpperCase(),
      requestBody: this.normalizePayload(body),
      errorMessage: String(lastError?.message || 'Erro desconhecido na integração Bling'),
      attempts: this.retryMax + 1,
    });

    throw new ServiceUnavailableException('Falha ao integrar com Bling após tentativas de retry');
  }

  async healthCheck() {
    return {
      provider: 'BLING',
      environment: this.blingEnv,
      configured: Boolean(this.apiKey),
      baseUrl:
        this.blingEnv === 'production'
          ? this.configService.get<string>('BLING_BASE_URL_PRODUCTION')
          : this.configService.get<string>('BLING_BASE_URL_HOMOLOG'),
    };
  }

  async syncClient(dto: SyncClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id: dto.localClientId } });
    if (!existing) {
      throw new ServiceUnavailableException('Cliente local não encontrado para sincronização');
    }

    if (existing.blingExternalId) {
      return {
        localClientId: existing.id,
        blingExternalId: existing.blingExternalId,
        alreadySynced: true,
      };
    }

    const xml = this.xmlBuilder.buildObject({
      contato: {
        nome: dto.name,
        telefone: dto.phone,
        documento: dto.document || '',
      },
    });

    const response = await this.callBling<any>(
      {
        url: '/contatos',
        method: 'POST',
        data: { xml },
      },
      { xml },
    );

    const externalId =
      response?.data?.id || response?.retorno?.contatos?.contato?.id || response?.id || null;

    await this.prisma.client.update({
      where: { id: dto.localClientId },
      data: { blingExternalId: externalId ? String(externalId) : null },
    });

    return {
      localClientId: dto.localClientId,
      blingExternalId: externalId ? String(externalId) : null,
      raw: response,
    };
  }

  async stockCheck(dto: StockCheckDto) {
    const externalProductId = dto.externalProductId || (await this.resolveExternalProductId(dto.localProductId));
    const response = await this.callBling<any>({
      url: `/produtos/${externalProductId}`,
      method: 'GET',
    });

    return {
      localProductId: dto.localProductId,
      externalProductId,
      raw: response,
    };
  }

  async stockMovement(dto: StockMovementDto) {
    const externalProductId = dto.externalProductId || (await this.resolveExternalProductId(dto.localProductId));

    const payload = {
      estoque: {
        produto: { id: externalProductId },
        operacao: dto.type,
        quantidade: dto.quantity,
      },
    };

    const response = await this.callBling<any>(
      {
        url: '/estoques',
        method: 'POST',
        data: payload,
      },
      payload,
    );

    return {
      localProductId: dto.localProductId,
      externalProductId,
      moved: true,
      raw: response,
    };
  }

  async finalizeMedicao(dto: FinalizeMedicaoDto) {
    const medicao = await this.prisma.medicao.findUnique({ where: { id: dto.medicaoId } });
    if (!medicao) {
      throw new ServiceUnavailableException('Medição local não encontrada');
    }

    const client = await this.prisma.client.findUnique({ where: { id: dto.localClientId } });
    if (!client?.blingExternalId) {
      throw new ServiceUnavailableException('Cliente sem vínculo Bling. Sincronize o cliente antes de finalizar.');
    }

    const orderPayload = {
      pedido: {
        cliente: { id: client.blingExternalId },
        itens: dto.items,
      },
    };

    const orderResponse = await this.callBling<any>(
      {
        url: '/pedidos/vendas',
        method: 'POST',
        data: orderPayload,
      },
      orderPayload,
    );

    const orderNumber =
      orderResponse?.data?.numero || orderResponse?.retorno?.pedido?.numero || orderResponse?.numero;

    const invoiceResponse = await this.callBling<any>(
      {
        url: '/nfe',
        method: 'POST',
        data: { pedidoNumero: orderNumber },
      },
      { pedidoNumero: orderNumber },
    );

    const invoiceAccessKey =
      invoiceResponse?.data?.chaveAcesso || invoiceResponse?.retorno?.nota?.chaveAcesso || null;
    const invoicePdfUrl =
      invoiceResponse?.data?.linkPdf || invoiceResponse?.retorno?.nota?.linkPdf || null;

    await this.prisma.medicao.update({
      where: { id: dto.medicaoId },
      data: {
        blingOrderNumber: orderNumber ? String(orderNumber) : null,
        invoiceAccessKey: invoiceAccessKey ? String(invoiceAccessKey) : null,
        invoicePdfUrl: invoicePdfUrl ? String(invoicePdfUrl) : null,
        finalizedAt: new Date(),
      },
    });

    return {
      medicaoId: dto.medicaoId,
      orderNumber,
      invoiceAccessKey,
      invoicePdfUrl,
      orderRaw: orderResponse,
      invoiceRaw: invoiceResponse,
    };
  }

  private async resolveExternalProductId(localProductId?: string) {
    if (!localProductId) {
      throw new ServiceUnavailableException('Informe localProductId ou externalProductId');
    }

    const product = await this.prisma.product.findUnique({ where: { id: localProductId } });
    if (!product?.blingExternalId) {
      throw new ServiceUnavailableException(
        'Produto sem vínculo Bling. Sincronize o produto antes de consultar ou movimentar estoque.',
      );
    }

    return product.blingExternalId;
  }
}
