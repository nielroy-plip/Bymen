"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bling_module_1 = require("./integrations/bling/bling.module");
const inventory_service_1 = require("./inventory/inventory.service");
const medicao_service_1 = require("./medicao/medicao.service");
const database_service_1 = require("./database/database.service");
const database_prisma_service_1 = require("./database/database.prisma.service");
const prisma_service_1 = require("./database/prisma.service");
const audit_middleware_1 = require("./common/middleware/audit.middleware");
const homolog_module_1 = require("./homolog/homolog.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(audit_middleware_1.AuditMiddleware).forRoutes({ path: '*path', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule.forRoot({ isGlobal: true }), bling_module_1.BlingModule, homolog_module_1.HomologModule],
        providers: [
            prisma_service_1.PrismaService,
            audit_middleware_1.AuditMiddleware,
            inventory_service_1.InventoryService,
            medicao_service_1.MedicaoService,
            {
                provide: database_service_1.DatabaseService,
                useClass: database_prisma_service_1.DatabasePrismaService,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map