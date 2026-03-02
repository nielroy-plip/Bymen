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
};
exports.BlingController = BlingController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BlingController.prototype, "health", null);
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
exports.BlingController = BlingController = __decorate([
    (0, common_1.Controller)('integrations/bling'),
    __metadata("design:paramtypes", [bling_service_1.BlingService])
], BlingController);
//# sourceMappingURL=bling.controller.js.map