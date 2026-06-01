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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlingController = void 0;
const common_1 = require("@nestjs/common");
const bling_service_1 = require("./bling.service");
const dto_1 = require("./dto");
let BlingController = class BlingController {
    constructor(blingService) {
        this.blingService = blingService;
    }
    health() {
        return this.blingService.healthCheck();
    }
    getAuthorizeUrl(state) {
        return this.blingService.getAuthorizeUrl(state);
    }
    exchangeToken(body) {
        return this.blingService.exchangeAuthorizationCode(body.code);
    }
    async oauthCallback(code, state, autoToken) {
        if (!code) {
            return {
                ok: false,
                message: 'Código de autorização não recebido no callback.',
                state,
            };
        }
        const shouldExchange = String(autoToken || '').toLowerCase() === 'true';
        if (!shouldExchange) {
            return {
                ok: true,
                message: 'Code recebido com sucesso. Envie este code para /oauth/token para trocar pelos tokens.',
                code,
                state,
            };
        }
        const tokenResponse = await this.blingService.exchangeAuthorizationCode(code);
        return {
            ok: true,
            message: 'Code recebido e trocado por tokens com sucesso.',
            state,
            tokenResponse,
        };
    }
    syncClient(dto) {
        return this.blingService.syncClient(dto);
    }
    stockCheck(dto) {
        return this.blingService.stockCheck(dto);
    }
    stockMovement(dto) {
        return this.blingService.stockMovement(dto);
    }
    finalize(medicaoId, dto) {
        return this.blingService.finalizeMedicao({ ...dto, medicaoId });
    }
    finalizeVenda(vendaId, dto) {
        return this.blingService.finalizeVenda({ ...dto, vendaId });
    }
    receiveWebhook(payload, authorization, webhookToken, blingTopic) {
        return this.blingService.receiveWebhook({
            payload,
            topicHint: blingTopic,
            authorization,
            webhookToken,
            endpoint: '/integrations/bling/webhooks',
        });
    }
    receiveWebhookByTopic(topic, payload, authorization, webhookToken) {
        return this.blingService.receiveWebhook({
            payload,
            topicHint: topic,
            authorization,
            webhookToken,
            endpoint: `/integrations/bling/webhooks/${topic}`,
        });
    }
};
exports.BlingController = BlingController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('oauth/authorize-url'),
    __param(0, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "getAuthorizeUrl", null);
__decorate([
    (0, common_1.Post)('oauth/token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "exchangeToken", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('autoToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BlingController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Post)('clients/sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SyncClientDto]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "syncClient", null);
__decorate([
    (0, common_1.Post)('stock/check'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StockCheckDto]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "stockCheck", null);
__decorate([
    (0, common_1.Post)('stock/movement'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StockMovementDto]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "stockMovement", null);
__decorate([
    (0, common_1.Post)('medicoes/:medicaoId/finalize'),
    __param(0, (0, common_1.Param)('medicaoId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('vendas/:vendaId/finalize'),
    __param(0, (0, common_1.Param)('vendaId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "finalizeVenda", null);
__decorate([
    (0, common_1.Post)('webhooks'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __param(2, (0, common_1.Headers)('x-webhook-token')),
    __param(3, (0, common_1.Headers)('x-bling-topic')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "receiveWebhook", null);
__decorate([
    (0, common_1.Post)('webhooks/:topic'),
    __param(0, (0, common_1.Param)('topic')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('authorization')),
    __param(3, (0, common_1.Headers)('x-webhook-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "receiveWebhookByTopic", null);
exports.BlingController = BlingController = __decorate([
    (0, common_1.Controller)('integrations/bling'),
    __metadata("design:paramtypes", [bling_service_1.BlingService])
], BlingController);
//# sourceMappingURL=bling.controller.js.map