import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Builder, parseStringPromise } from 'xml2js';
import { PrismaService } from '../../database/prisma.service';
import {
  FinalizeMedicaoDto,
  FinalizeVendaDto,
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
    const oauthClientId = this.configService.get<string>('BLING_CLIENT_ID') || '';
    const oauthRedirectUri = this.configService.get<string>('BLING_OAUTH_REDIRECT_URI') || '';

    return {
      provider: 'BLING',
      environment: this.blingEnv,
      configured: Boolean(this.apiKey),
      oauthConfigured: Boolean(oauthClientId && oauthRedirectUri),
      baseUrl:
        this.blingEnv === 'production'
          ? this.configService.get<string>('BLING_BASE_URL_PRODUCTION')
          : this.configService.get<string>('BLING_BASE_URL_HOMOLOG'),
    };
  }

  getAuthorizeUrl(state?: string) {
    const oauthClientId = (this.configService.get<string>('BLING_CLIENT_ID') || '').trim();
    const oauthRedirectUri = (this.configService.get<string>('BLING_OAUTH_REDIRECT_URI') || '').trim();

    if (!oauthClientId || !oauthRedirectUri) {
      throw new ServiceUnavailableException(
        'Configure BLING_CLIENT_ID e BLING_OAUTH_REDIRECT_URI para gerar a URL de autorização.',
      );
    }

    const safeState = String(state || '').trim() || this.generateState();
    const url = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', oauthClientId);
    url.searchParams.set('state', safeState);
    url.searchParams.set('redirect_uri', oauthRedirectUri);

    return {
      authorizeUrl: url.toString(),
      state: safeState,
      redirectUri: oauthRedirectUri,
    };
  }

  async exchangeAuthorizationCode(code: string) {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) {
      throw new ServiceUnavailableException('Authorization code não informado.');
    }

    const oauthClientId = (this.configService.get<string>('BLING_CLIENT_ID') || '').trim();
    const oauthClientSecret = (this.configService.get<string>('BLING_CLIENT_SECRET') || '').trim();
    const oauthRedirectUri = (this.configService.get<string>('BLING_OAUTH_REDIRECT_URI') || '').trim();

    if (!oauthClientId || !oauthClientSecret || !oauthRedirectUri) {
      throw new ServiceUnavailableException(
        'Configure BLING_CLIENT_ID, BLING_CLIENT_SECRET e BLING_OAUTH_REDIRECT_URI para trocar code por token.',
      );
    }

    const basic = Buffer.from(`${oauthClientId}:${oauthClientSecret}`).toString('base64');
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: normalizedCode,
    });

    try {
      const response = await axios.post('https://api.bling.com.br/Api/v3/oauth/token', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
          Accept: '1.0',
        },
        timeout: this.timeoutMs,
      });

      const tokenPayload = response.data || {};

      await this.logIntegration({
        endpoint: '/oauth/token',
        method: 'POST',
        requestBody: this.normalizePayload({ grant_type: 'authorization_code', code: '***' }),
        responseBody: this.normalizePayload(tokenPayload),
        statusCode: response.status,
        success: true,
      });

      return {
        tokenType: tokenPayload?.token_type,
        expiresIn: tokenPayload?.expires_in,
        scope: tokenPayload?.scope,
        accessToken: tokenPayload?.access_token,
        refreshToken: tokenPayload?.refresh_token,
        redirectUri: oauthRedirectUri,
      };
    } catch (error: any) {
      await this.logIntegration({
        endpoint: '/oauth/token',
        method: 'POST',
        requestBody: this.normalizePayload({ grant_type: 'authorization_code', code: '***' }),
        responseBody: this.normalizePayload(error?.response?.data || { message: error?.message }),
        statusCode: error?.response?.status,
        success: false,
      });

      throw new ServiceUnavailableException(
        `Falha ao trocar authorization code por token no Bling: ${String(error?.response?.data?.error_description || error?.message || 'erro desconhecido')}`,
      );
    }
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

  async finalizeVenda(dto: FinalizeVendaDto) {
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

    await this.prisma.auditLog.create({
      data: {
        action: 'VENDA_BLING_FINALIZE',
        userId: dto.localClientId,
        details: JSON.stringify({
          vendaId: dto.vendaId,
          localClientId: dto.localClientId,
          orderNumber,
          invoiceAccessKey,
          invoicePdfUrl,
        }),
      },
    });

    return {
      vendaId: dto.vendaId,
      orderNumber,
      invoiceAccessKey,
      invoicePdfUrl,
      orderRaw: orderResponse,
      invoiceRaw: invoiceResponse,
    };
  }

  async receiveWebhook(params: {
    payload: Record<string, unknown>;
    topicHint?: string;
    authorization?: string;
    webhookToken?: string;
    endpoint?: string;
  }) {
    this.validateWebhookToken(params.authorization, params.webhookToken);

    const topic = this.resolveWebhookTopic(params.payload, params.topicHint);
    const eventName = this.resolveWebhookEvent(params.payload);

    const response: {
      received: boolean;
      topic: string;
      event: string;
      action: 'PRODUCT_SYNCED' | 'STOCK_SYNCED' | 'IGNORED';
      details?: Record<string, unknown>;
    } = {
      received: true,
      topic,
      event: eventName,
      action: 'IGNORED',
    };

    try {
      if (this.isProductWebhook(topic, eventName)) {
        const details = await this.syncProductFromWebhook(params.payload);
        response.action = 'PRODUCT_SYNCED';
        response.details = details;
      } else if (this.isStockWebhook(topic, eventName)) {
        const details = await this.syncStockFromWebhook(params.payload);
        response.action = 'STOCK_SYNCED';
        response.details = details;
      }

      await this.logIntegration({
        endpoint: params.endpoint || '/integrations/bling/webhooks',
        method: 'POST',
        requestBody: this.normalizePayload(params.payload),
        responseBody: this.normalizePayload(response),
        statusCode: 200,
        success: true,
      });

      return response;
    } catch (error: any) {
      await this.logIntegration({
        endpoint: params.endpoint || '/integrations/bling/webhooks',
        method: 'POST',
        requestBody: this.normalizePayload(params.payload),
        responseBody: this.normalizePayload({
          message: String(error?.message || 'Falha ao processar webhook Bling'),
          topic,
          event: eventName,
        }),
        statusCode: 500,
        success: false,
      });

      throw error;
    }
  }

  private validateWebhookToken(authorization?: string, webhookToken?: string) {
    const expectedToken = (this.configService.get<string>('BLING_WEBHOOK_TOKEN') || '').trim();
    if (!expectedToken) {
      return;
    }

    const bearerToken = (authorization || '').replace(/^Bearer\s+/i, '').trim();
    const headerToken = String(webhookToken || '').trim();
    if (expectedToken !== bearerToken && expectedToken !== headerToken) {
      throw new UnauthorizedException('Webhook token inválido');
    }
  }

  private resolveWebhookTopic(payload: Record<string, unknown>, topicHint?: string) {
    const raw =
      topicHint ||
      this.pickString(payload, ['topic', 'assunto', 'resource', 'entidade']) ||
      this.pickString(payload, ['evento', 'event']) ||
      'unknown';
    return raw.toLowerCase();
  }

  private resolveWebhookEvent(payload: Record<string, unknown>) {
    const raw =
      this.pickString(payload, ['event', 'evento', 'action', 'acao', 'tipo']) ||
      this.pickString(payload, ['operation', 'operacao']) ||
      'unknown';
    return raw.toLowerCase();
  }

  private isProductWebhook(topic: string, eventName: string) {
    return topic.includes('produto') || eventName.includes('produto');
  }

  private isStockWebhook(topic: string, eventName: string) {
    return (
      topic.includes('estoque') ||
      eventName.includes('estoque') ||
      topic.includes('inventory') ||
      eventName.includes('inventory')
    );
  }

  private async syncProductFromWebhook(payload: Record<string, unknown>) {
    const externalId =
      this.pickString(payload, ['id']) ||
      this.pickString(payload, ['produto.id']) ||
      this.pickString(payload, ['data.id']) ||
      this.pickString(payload, ['data.produto.id']);

    if (!externalId) {
      return { synced: false, reason: 'external_product_id_not_found' };
    }

    const name =
      this.pickString(payload, ['nome']) ||
      this.pickString(payload, ['produto.nome']) ||
      this.pickString(payload, ['data.nome']) ||
      this.pickString(payload, ['data.produto.nome']) ||
      `Produto Bling ${externalId}`;

    const line =
      this.pickString(payload, ['linha']) ||
      this.pickString(payload, ['produto.linha']) ||
      this.pickString(payload, ['data.linha']) ||
      'Bymen';

    const capacity =
      this.pickString(payload, ['capacidade']) ||
      this.pickString(payload, ['produto.capacidade']) ||
      this.pickString(payload, ['data.capacidade']) ||
      '';

    const basePrice =
      this.pickNumber(payload, ['preco']) ||
      this.pickNumber(payload, ['produto.preco']) ||
      this.pickNumber(payload, ['data.preco']) ||
      this.pickNumber(payload, ['precoVenda']) ||
      0;

    const suggestedPrice =
      this.pickNumber(payload, ['precoSugestao']) ||
      this.pickNumber(payload, ['produto.precoSugestao']) ||
      this.pickNumber(payload, ['data.precoSugestao']) ||
      basePrice;

    const existing = await this.prisma.product.findFirst({
      where: { blingExternalId: String(externalId) },
    });

    if (existing) {
      const updated = await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          name,
          line,
          capacity,
          basePrice,
          suggestedPrice,
        },
      });

      return {
        synced: true,
        mode: 'update',
        localProductId: updated.id,
        externalProductId: externalId,
      };
    }

    const created = await this.prisma.product.create({
      data: {
        name,
        line,
        capacity,
        type: 'VENDA',
        basePrice,
        suggestedPrice,
        blingExternalId: String(externalId),
      },
    });

    return {
      synced: true,
      mode: 'create',
      localProductId: created.id,
      externalProductId: externalId,
    };
  }

  private async syncStockFromWebhook(payload: Record<string, unknown>) {
    const externalProductId =
      this.pickString(payload, ['produto.id']) ||
      this.pickString(payload, ['data.produto.id']) ||
      this.pickString(payload, ['produtoId']) ||
      this.pickString(payload, ['idProduto']) ||
      this.pickString(payload, ['id']);

    if (!externalProductId) {
      return { synced: false, reason: 'external_product_id_not_found' };
    }

    const product =
      (await this.prisma.product.findFirst({ where: { blingExternalId: String(externalProductId) } })) ||
      (await this.prisma.product.create({
        data: {
          name: `Produto Bling ${externalProductId}`,
          line: 'Bymen',
          capacity: '',
          type: 'VENDA',
          basePrice: 0,
          suggestedPrice: 0,
          blingExternalId: String(externalProductId),
        },
      }));

    const reportedBalance =
      this.pickNumber(payload, ['saldo']) ||
      this.pickNumber(payload, ['data.saldo']) ||
      this.pickNumber(payload, ['estoque']) ||
      this.pickNumber(payload, ['data.estoque']) ||
      this.pickNumber(payload, ['quantidade']) ||
      this.pickNumber(payload, ['data.quantidade']);

    if (reportedBalance == null) {
      return {
        synced: false,
        reason: 'balance_not_found',
        localProductId: product.id,
        externalProductId,
      };
    }

    const locationId = 'bling-main';
    await this.ensureInventoryLocation(locationId);

    const currentBalance = await this.getCurrentBalance(product.id, locationId);
    const delta = Number(reportedBalance) - Number(currentBalance);

    if (delta === 0) {
      return {
        synced: true,
        mode: 'noop',
        localProductId: product.id,
        externalProductId,
        balance: reportedBalance,
      };
    }

    await this.prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        locationId,
        type: delta > 0 ? 'ENTRADA' : 'RETIRADA',
        quantity: Math.abs(delta),
        unitPriceSnapshot: Number(product.suggestedPrice || product.basePrice || 0),
        blingExternalId: String(externalProductId),
        createdBy: 'bling-webhook',
      },
    });

    return {
      synced: true,
      mode: 'movement',
      localProductId: product.id,
      externalProductId,
      previousBalance: currentBalance,
      newBalance: reportedBalance,
      delta,
    };
  }

  private async ensureInventoryLocation(locationId: string) {
    const existing = await this.prisma.inventoryLocation.findUnique({ where: { id: locationId } });
    if (existing) {
      return existing;
    }

    return this.prisma.inventoryLocation.create({
      data: {
        id: locationId,
        name: 'Estoque Bling',
        affectsFinancial: true,
      },
    });
  }

  private async getCurrentBalance(productId: string, locationId: string) {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: { productId, locationId },
      select: { type: true, quantity: true },
    });

    return rows.reduce((acc, row) => {
      if (['RETIRADA', 'VENDA'].includes(row.type)) {
        return acc - row.quantity;
      }
      return acc + row.quantity;
    }, 0);
  }

  private pickString(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = this.pickByPath(payload, key);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return undefined;
  }

  private pickNumber(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = this.pickByPath(payload, key);
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const normalized = Number(value.replace(',', '.'));
        if (Number.isFinite(normalized)) {
          return normalized;
        }
      }
    }
    return undefined;
  }

  private pickByPath(payload: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = payload;

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private generateState() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
