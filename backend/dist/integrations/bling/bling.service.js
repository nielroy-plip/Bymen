"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BlingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const prisma_service_1 = require("../../database/prisma.service");
let BlingService = BlingService_1 = class BlingService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(BlingService_1.name);
        this.xmlBuilder = new xml2js_1.Builder({ headless: true });
        this.lastRequestAt = 0;
        this.blingEnv = (this.configService.get('BLING_ENV') || 'homolog');
        const baseURL = this.blingEnv === 'production'
            ? this.configService.get('BLING_BASE_URL_PRODUCTION')
            : this.configService.get('BLING_BASE_URL_HOMOLOG');
        this.apiKey =
            this.blingEnv === 'production'
                ? this.configService.get('BLING_API_KEY_PRODUCTION') || ''
                : this.configService.get('BLING_API_KEY_HOMOLOG') || '';
        this.retryMax = Number(this.configService.get('BLING_RETRY_MAX') || 3);
        this.retryBaseMs = Number(this.configService.get('BLING_RETRY_BASE_MS') || 500);
        this.timeoutMs = Number(this.configService.get('BLING_TIMEOUT_MS') || 12000);
        this.requestsPerSecond = Number(this.configService.get('BLING_RATE_LIMIT_RPS') || 4);
        this.http = axios_1.default.create({
            baseURL,
            timeout: this.timeoutMs,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    async enforceRateLimit() {
        const minInterval = Math.ceil(1000 / this.requestsPerSecond);
        const diff = Date.now() - this.lastRequestAt;
        if (diff < minInterval) {
            await new Promise((resolve) => setTimeout(resolve, minInterval - diff));
        }
        this.lastRequestAt = Date.now();
    }
    normalizePayload(payload) {
        if (payload == null) {
            return '';
        }
        if (typeof payload === 'string') {
            return payload;
        }
        return JSON.stringify(payload);
    }
    async toJsonResponse(data) {
        if (typeof data === 'string' && data.trim().startsWith('<')) {
            return (0, xml2js_1.parseStringPromise)(data, { explicitArray: false, explicitRoot: false });
        }
        return data;
    }
    async logIntegration(params) {
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
    async pushDeadLetter(params) {
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
    async callBling(config, body) {
        if (!this.apiKey) {
            throw new common_1.ServiceUnavailableException('BLING API key não configurada para o ambiente atual');
        }
        let attempt = 0;
        let lastError;
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
                return parsed;
            }
            catch (error) {
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
        throw new common_1.ServiceUnavailableException('Falha ao integrar com Bling após tentativas de retry');
    }
    async healthCheck() {
        const oauthClientId = this.configService.get('BLING_CLIENT_ID') || '';
        const oauthRedirectUri = this.configService.get('BLING_OAUTH_REDIRECT_URI') || '';
        return {
            provider: 'BLING',
            environment: this.blingEnv,
            configured: Boolean(this.apiKey),
            oauthConfigured: Boolean(oauthClientId && oauthRedirectUri),
            baseUrl: this.blingEnv === 'production'
                ? this.configService.get('BLING_BASE_URL_PRODUCTION')
                : this.configService.get('BLING_BASE_URL_HOMOLOG'),
        };
    }
    getAuthorizeUrl(state) {
        const oauthClientId = (this.configService.get('BLING_CLIENT_ID') || '').trim();
        const oauthRedirectUri = (this.configService.get('BLING_OAUTH_REDIRECT_URI') || '').trim();
        if (!oauthClientId || !oauthRedirectUri) {
            throw new common_1.ServiceUnavailableException('Configure BLING_CLIENT_ID e BLING_OAUTH_REDIRECT_URI para gerar a URL de autorização.');
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
    async exchangeAuthorizationCode(code) {
        const normalizedCode = String(code || '').trim();
        if (!normalizedCode) {
            throw new common_1.ServiceUnavailableException('Authorization code não informado.');
        }
        const oauthClientId = (this.configService.get('BLING_CLIENT_ID') || '').trim();
        const oauthClientSecret = (this.configService.get('BLING_CLIENT_SECRET') || '').trim();
        const oauthRedirectUri = (this.configService.get('BLING_OAUTH_REDIRECT_URI') || '').trim();
        if (!oauthClientId || !oauthClientSecret || !oauthRedirectUri) {
            throw new common_1.ServiceUnavailableException('Configure BLING_CLIENT_ID, BLING_CLIENT_SECRET e BLING_OAUTH_REDIRECT_URI para trocar code por token.');
        }
        const basic = Buffer.from(`${oauthClientId}:${oauthClientSecret}`).toString('base64');
        const payload = new URLSearchParams({
            grant_type: 'authorization_code',
            code: normalizedCode,
        });
        try {
            const response = await axios_1.default.post('https://api.bling.com.br/Api/v3/oauth/token', payload.toString(), {
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
        }
        catch (error) {
            await this.logIntegration({
                endpoint: '/oauth/token',
                method: 'POST',
                requestBody: this.normalizePayload({ grant_type: 'authorization_code', code: '***' }),
                responseBody: this.normalizePayload(error?.response?.data || { message: error?.message }),
                statusCode: error?.response?.status,
                success: false,
            });
            throw new common_1.ServiceUnavailableException(`Falha ao trocar authorization code por token no Bling: ${String(error?.response?.data?.error_description || error?.message || 'erro desconhecido')}`);
        }
    }
    async syncClient(dto) {
        const existing = await this.prisma.client.findUnique({ where: { id: dto.localClientId } });
        if (!existing) {
            throw new common_1.ServiceUnavailableException('Cliente local não encontrado para sincronização');
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
        const response = await this.callBling({
            url: '/contatos',
            method: 'POST',
            data: { xml },
        }, { xml });
        const externalId = response?.data?.id || response?.retorno?.contatos?.contato?.id || response?.id || null;
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
    async stockCheck(dto) {
        const externalProductId = dto.externalProductId || (await this.resolveExternalProductId(dto.localProductId));
        const response = await this.callBling({
            url: `/produtos/${externalProductId}`,
            method: 'GET',
        });
        return {
            localProductId: dto.localProductId,
            externalProductId,
            raw: response,
        };
    }
    async stockMovement(dto) {
        const externalProductId = dto.externalProductId || (await this.resolveExternalProductId(dto.localProductId));
        const payload = {
            estoque: {
                produto: { id: externalProductId },
                operacao: dto.type,
                quantidade: dto.quantity,
            },
        };
        const response = await this.callBling({
            url: '/estoques',
            method: 'POST',
            data: payload,
        }, payload);
        return {
            localProductId: dto.localProductId,
            externalProductId,
            moved: true,
            raw: response,
        };
    }
    async finalizeMedicao(dto) {
        const medicao = await this.prisma.medicao.findUnique({ where: { id: dto.medicaoId } });
        if (!medicao) {
            throw new common_1.ServiceUnavailableException('Medição local não encontrada');
        }
        const client = await this.prisma.client.findUnique({ where: { id: dto.localClientId } });
        if (!client?.blingExternalId) {
            throw new common_1.ServiceUnavailableException('Cliente sem vínculo Bling. Sincronize o cliente antes de finalizar.');
        }
        const orderPayload = {
            pedido: {
                cliente: { id: client.blingExternalId },
                itens: dto.items,
            },
        };
        const orderResponse = await this.callBling({
            url: '/pedidos/vendas',
            method: 'POST',
            data: orderPayload,
        }, orderPayload);
        const orderNumber = orderResponse?.data?.numero || orderResponse?.retorno?.pedido?.numero || orderResponse?.numero;
        const invoiceResponse = await this.callBling({
            url: '/nfe',
            method: 'POST',
            data: { pedidoNumero: orderNumber },
        }, { pedidoNumero: orderNumber });
        const invoiceAccessKey = invoiceResponse?.data?.chaveAcesso || invoiceResponse?.retorno?.nota?.chaveAcesso || null;
        const invoicePdfUrl = invoiceResponse?.data?.linkPdf || invoiceResponse?.retorno?.nota?.linkPdf || null;
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
    async finalizeVenda(dto) {
        const client = await this.prisma.client.findUnique({ where: { id: dto.localClientId } });
        if (!client?.blingExternalId) {
            throw new common_1.ServiceUnavailableException('Cliente sem vínculo Bling. Sincronize o cliente antes de finalizar.');
        }
        const orderPayload = {
            pedido: {
                cliente: { id: client.blingExternalId },
                itens: dto.items,
            },
        };
        const orderResponse = await this.callBling({
            url: '/pedidos/vendas',
            method: 'POST',
            data: orderPayload,
        }, orderPayload);
        const orderNumber = orderResponse?.data?.numero || orderResponse?.retorno?.pedido?.numero || orderResponse?.numero;
        const invoiceResponse = await this.callBling({
            url: '/nfe',
            method: 'POST',
            data: { pedidoNumero: orderNumber },
        }, { pedidoNumero: orderNumber });
        const invoiceAccessKey = invoiceResponse?.data?.chaveAcesso || invoiceResponse?.retorno?.nota?.chaveAcesso || null;
        const invoicePdfUrl = invoiceResponse?.data?.linkPdf || invoiceResponse?.retorno?.nota?.linkPdf || null;
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
    async receiveWebhook(params) {
        this.validateWebhookToken(params.authorization, params.webhookToken);
        const topic = this.resolveWebhookTopic(params.payload, params.topicHint);
        const eventName = this.resolveWebhookEvent(params.payload);
        const response = {
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
            }
            else if (this.isStockWebhook(topic, eventName)) {
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
        }
        catch (error) {
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
    validateWebhookToken(authorization, webhookToken) {
        const expectedToken = (this.configService.get('BLING_WEBHOOK_TOKEN') || '').trim();
        if (!expectedToken) {
            return;
        }
        const bearerToken = (authorization || '').replace(/^Bearer\s+/i, '').trim();
        const headerToken = String(webhookToken || '').trim();
        if (expectedToken !== bearerToken && expectedToken !== headerToken) {
            throw new common_1.UnauthorizedException('Webhook token inválido');
        }
    }
    resolveWebhookTopic(payload, topicHint) {
        const raw = topicHint ||
            this.pickString(payload, ['topic', 'assunto', 'resource', 'entidade']) ||
            this.pickString(payload, ['evento', 'event']) ||
            'unknown';
        return raw.toLowerCase();
    }
    resolveWebhookEvent(payload) {
        const raw = this.pickString(payload, ['event', 'evento', 'action', 'acao', 'tipo']) ||
            this.pickString(payload, ['operation', 'operacao']) ||
            'unknown';
        return raw.toLowerCase();
    }
    isProductWebhook(topic, eventName) {
        return topic.includes('produto') || eventName.includes('produto');
    }
    isStockWebhook(topic, eventName) {
        return (topic.includes('estoque') ||
            eventName.includes('estoque') ||
            topic.includes('inventory') ||
            eventName.includes('inventory'));
    }
    async syncProductFromWebhook(payload) {
        const externalId = this.pickString(payload, ['id']) ||
            this.pickString(payload, ['produto.id']) ||
            this.pickString(payload, ['data.id']) ||
            this.pickString(payload, ['data.produto.id']);
        if (!externalId) {
            return { synced: false, reason: 'external_product_id_not_found' };
        }
        const name = this.pickString(payload, ['nome']) ||
            this.pickString(payload, ['produto.nome']) ||
            this.pickString(payload, ['data.nome']) ||
            this.pickString(payload, ['data.produto.nome']) ||
            `Produto Bling ${externalId}`;
        const line = this.pickString(payload, ['linha']) ||
            this.pickString(payload, ['produto.linha']) ||
            this.pickString(payload, ['data.linha']) ||
            'Bymen';
        const capacity = this.pickString(payload, ['capacidade']) ||
            this.pickString(payload, ['produto.capacidade']) ||
            this.pickString(payload, ['data.capacidade']) ||
            '';
        const basePrice = this.pickNumber(payload, ['preco']) ||
            this.pickNumber(payload, ['produto.preco']) ||
            this.pickNumber(payload, ['data.preco']) ||
            this.pickNumber(payload, ['precoVenda']) ||
            0;
        const suggestedPrice = this.pickNumber(payload, ['precoSugestao']) ||
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
    async syncStockFromWebhook(payload) {
        const externalProductId = this.pickString(payload, ['produto.id']) ||
            this.pickString(payload, ['data.produto.id']) ||
            this.pickString(payload, ['produtoId']) ||
            this.pickString(payload, ['idProduto']) ||
            this.pickString(payload, ['id']);
        if (!externalProductId) {
            return { synced: false, reason: 'external_product_id_not_found' };
        }
        const product = (await this.prisma.product.findFirst({ where: { blingExternalId: String(externalProductId) } })) ||
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
        const reportedBalance = this.pickNumber(payload, ['saldo']) ||
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
    async ensureInventoryLocation(locationId) {
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
    async getCurrentBalance(productId, locationId) {
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
    pickString(payload, keys) {
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
    pickNumber(payload, keys) {
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
    pickByPath(payload, path) {
        const parts = path.split('.');
        let current = payload;
        for (const part of parts) {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    generateState() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    async resolveExternalProductId(localProductId) {
        if (!localProductId) {
            throw new common_1.ServiceUnavailableException('Informe localProductId ou externalProductId');
        }
        const product = await this.prisma.product.findUnique({ where: { id: localProductId } });
        if (!product?.blingExternalId) {
            throw new common_1.ServiceUnavailableException('Produto sem vínculo Bling. Sincronize o produto antes de consultar ou movimentar estoque.');
        }
        return product.blingExternalId;
    }
};
exports.BlingService = BlingService;
exports.BlingService = BlingService = BlingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], BlingService);
//# sourceMappingURL=bling.service.js.map