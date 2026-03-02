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
exports.HomologController = void 0;
const common_1 = require("@nestjs/common");
const homolog_service_1 = require("./homolog.service");
const register_user_dto_1 = require("./dto/register-user.dto");
const login_user_dto_1 = require("./dto/login-user.dto");
const upsert_client_dto_1 = require("./dto/upsert-client.dto");
const save_measurement_dto_1 = require("./dto/save-measurement.dto");
const stock_movement_dto_1 = require("./dto/stock-movement.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const update_user_profile_dto_1 = require("./dto/update-user-profile.dto");
let HomologController = class HomologController {
    constructor(homologService) {
        this.homologService = homologService;
    }
    register(dto) {
        return this.homologService.registerUser(dto);
    }
    login(dto) {
        return this.homologService.login(dto);
    }
    changePassword(dto) {
        return this.homologService.changePassword(dto);
    }
    updateProfile(dto) {
        return this.homologService.updateUserProfile(dto);
    }
    upsertClient(dto) {
        return this.homologService.upsertClient(dto);
    }
    listClients() {
        return this.homologService.listClients();
    }
    deleteClient(id) {
        return this.homologService.deleteClient(id);
    }
    saveMeasurement(dto) {
        return this.homologService.saveMeasurement(dto);
    }
    listMeasurements() {
        return this.homologService.listMeasurements();
    }
    saveStockMovement(dto) {
        return this.homologService.saveStockMovement(dto);
    }
    getStockBalances() {
        return this.homologService.getStockBalances();
    }
};
exports.HomologController = HomologController;
__decorate([
    (0, common_1.Post)('users/register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_user_dto_1.RegisterUserDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('users/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_user_dto_1.LoginUserDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('users/change-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('users/profile/update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_user_profile_dto_1.UpdateUserProfileDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('clients/upsert'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_client_dto_1.UpsertClientDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "upsertClient", null);
__decorate([
    (0, common_1.Get)('clients'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "listClients", null);
__decorate([
    (0, common_1.Delete)('clients/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "deleteClient", null);
__decorate([
    (0, common_1.Post)('measurements/upsert'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_measurement_dto_1.SaveMeasurementDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "saveMeasurement", null);
__decorate([
    (0, common_1.Get)('measurements'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "listMeasurements", null);
__decorate([
    (0, common_1.Post)('stock/movement'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [stock_movement_dto_1.StockMovementDto]),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "saveStockMovement", null);
__decorate([
    (0, common_1.Get)('stock/balances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HomologController.prototype, "getStockBalances", null);
exports.HomologController = HomologController = __decorate([
    (0, common_1.Controller)('homolog'),
    __metadata("design:paramtypes", [homolog_service_1.HomologService])
], HomologController);
//# sourceMappingURL=homolog.controller.js.map