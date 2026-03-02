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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMovementDto = void 0;
const class_validator_1 = require("class-validator");
const movementTypes = ['VENDA', 'REPOSICAO', 'ENTRADA', 'RETIRADA', 'AJUSTE'];
class StockMovementDto {
}
exports.StockMovementDto = StockMovementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StockMovementDto.prototype, "localProductId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StockMovementDto.prototype, "externalProductId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], StockMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(movementTypes),
    __metadata("design:type", Object)
], StockMovementDto.prototype, "type", void 0);
//# sourceMappingURL=stock-movement.dto.js.map