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
        return {
            provider: 'BLING',
            environment: this.blingEnv,
            configured: Boolean(this.apiKey),
            baseUrl: this.blingEnv === 'production'
                ? this.configService.get('BLING_BASE_URL_PRODUCTION')
                : this.configService.get('BLING_BASE_URL_HOMOLOG'),
        };
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