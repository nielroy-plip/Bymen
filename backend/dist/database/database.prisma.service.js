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
exports.DatabasePrismaService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("./database.service");
const prisma_service_1 = require("./prisma.service");
let DatabasePrismaService = class DatabasePrismaService extends database_service_1.DatabaseService {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async transaction(fn) {
        return this.prisma.$transaction(async (tx) => {
            const facade = {
                getSaldoProdutoLocal: (productId, locationId) => this.getSaldoProdutoLocal(productId, locationId, tx),
                createInventoryMovement: (data) => tx.inventoryMovement.create({ data }),
                createAuditLog: (data) => tx.auditLog.create({ data }),
            };
            return fn(facade);
        });
    }
    async getSaldoProdutoLocal(productId, locationId, tx) {
        const client = tx ?? this.prisma;
        const rows = await client.inventoryMovement.findMany({
            where: { productId, locationId },
            select: { type: true, quantity: true },
        });
        return rows.reduce((acc, row) => {
            if (['VENDA', 'RETIRADA'].includes(row.type)) {
                return acc - row.quantity;
            }
            return acc + row.quantity;
        }, 0);
    }
    async createInventoryMovement(data) {
        return this.prisma.inventoryMovement.create({ data });
    }
    async createAuditLog(data) {
        await this.prisma.auditLog.create({ data });
    }
    async updateMedicaoWhereIdAndVersion(id, version, data) {
        const result = await this.prisma.medicao.updateMany({
            where: {
                id,
                version,
                status: { not: 'SIGNED' },
            },
            data: {
                ...data,
                version: { increment: 1 },
            },
        });
        if (result.count === 0) {
            return null;
        }
        return this.prisma.medicao.findUnique({ where: { id } });
    }
};
exports.DatabasePrismaService = DatabasePrismaService;
exports.DatabasePrismaService = DatabasePrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DatabasePrismaService);
//# sourceMappingURL=database.prisma.service.js.map