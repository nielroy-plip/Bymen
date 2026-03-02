"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomologService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
let HomologService = class HomologService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerUser(dto) {
        const email = dto.email.trim().toLowerCase();
        const username = (dto.username || '').trim().toLowerCase();
        if (!username || username.length < 3) {
            throw new common_1.BadRequestException('Usuário deve ter no mínimo 3 caracteres');
        }
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('E-mail já cadastrado');
        }
        const existingUsername = await this.prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            throw new common_1.ConflictException('Nome de usuário já cadastrado');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email,
                username,
                phone: dto.phone?.trim() || null,
                passwordHash,
                role: dto.role?.trim() || 'USER',
            },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                action: 'USER_PROFILE_UPSERT',
                userId: user.id,
                details: JSON.stringify({
                    email,
                    username,
                    phone: dto.phone?.trim() || '',
                }),
            },
        });
        return user;
    }
    async login(dto) {
        const identifier = dto.identifier.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const isValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            role: user.role,
        };
    }
    async updateUserProfile(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        const username = dto.username?.trim().toLowerCase();
        if (username && username !== user.username) {
            const taken = await this.prisma.user.findUnique({ where: { username } });
            if (taken) {
                throw new common_1.ConflictException('Nome de usuário já cadastrado');
            }
        }
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                username: username || user.username,
                phone: dto.phone?.trim() || null,
            },
            select: {
                id: true,
                email: true,
                username: true,
                phone: true,
                role: true,
            },
        });
        return updated;
    }
    async changePassword(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado');
        }
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Senha atual inválida');
        }
        const newHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
        });
        return { success: true };
    }
    async upsertClient(dto) {
        const documentRaw = (dto.cnpjCpf || '').trim();
        const normalizedDocument = documentRaw.replace(/\D/g, '');
        const documentHash = (0, crypto_1.createHash)('sha256').update(normalizedDocument || dto.id).digest('hex');
        const payload = {
            nome: dto.nome,
            telefone: dto.telefone,
            cnpjCpf: dto.cnpjCpf || '',
            endereco: dto.endereco || '',
            responsavel: dto.responsavel || '',
        };
        const existingById = await this.prisma.client.findUnique({ where: { id: dto.id } });
        if (existingById) {
            return this.prisma.client.update({
                where: { id: dto.id },
                data: {
                    name: dto.nome,
                    phone: dto.telefone,
                    documentEnc: JSON.stringify(payload),
                    documentHash,
                },
            });
        }
        const existingByHash = await this.prisma.client.findUnique({ where: { documentHash } });
        if (existingByHash) {
            return this.prisma.client.update({
                where: { id: existingByHash.id },
                data: {
                    name: dto.nome,
                    phone: dto.telefone,
                    documentEnc: JSON.stringify(payload),
                    documentHash,
                },
            });
        }
        return this.prisma.client.create({
            data: {
                id: dto.id,
                name: dto.nome,
                phone: dto.telefone,
                documentEnc: JSON.stringify(payload),
                documentHash,
            },
        });
    }
    async listClients() {
        const rows = await this.prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((item) => {
            let parsed = {};
            try {
                parsed = JSON.parse(item.documentEnc || '{}');
            }
            catch {
                parsed = {};
            }
            return {
                id: item.id,
                nome: parsed.nome || item.name,
                telefone: parsed.telefone || item.phone,
                cnpjCpf: parsed.cnpjCpf || '',
                endereco: parsed.endereco || '',
                responsavel: parsed.responsavel || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
        });
    }
    async deleteClient(id) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client) {
            throw new common_1.NotFoundException('Barbearia não encontrada');
        }
        await this.prisma.client.delete({ where: { id } });
        return { success: true, id };
    }
    async saveMeasurement(dto) {
        const contentHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(dto)).digest('hex');
        const medicao = await this.prisma.medicao.upsert({
            where: { id: dto.id },
            update: {
                status: dto.status || 'FINALIZED',
                totalSnapshot: dto.totalGeral,
                contentHash,
                idempotencyKey: dto.id,
                updatedBy: dto.responsavel || null,
                finalizedAt: new Date(),
            },
            create: {
                id: dto.id,
                status: dto.status || 'FINALIZED',
                totalSnapshot: dto.totalGeral,
                contentHash,
                idempotencyKey: dto.id,
                createdBy: dto.responsavel || null,
                updatedBy: dto.responsavel || null,
                finalizedAt: new Date(),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                action: 'MEDICAO_UPSERT',
                userId: dto.responsavel || 'mobile-app',
                details: JSON.stringify(dto),
            },
        });
        return medicao;
    }
    async listMeasurements() {
        const rows = await this.prisma.auditLog.findMany({
            where: { action: 'MEDICAO_UPSERT' },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
        return rows.map((row) => {
            try {
                return JSON.parse(row.details);
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    async saveStockMovement(dto) {
        const locationId = dto.locationId || 'homolog-main';
        const movementType = dto.type === 'SAIDA' ? 'RETIRADA' : 'ENTRADA';
        await this.ensureInventoryLocation(locationId);
        await this.ensureProduct(dto);
        const saldo = await this.getCurrentBalance(dto.productId, locationId);
        if (dto.type === 'SAIDA' && saldo < dto.quantity) {
            throw new common_1.BadRequestException('Estoque insuficiente para saída');
        }
        const movement = await this.prisma.inventoryMovement.create({
            data: {
                productId: dto.productId,
                locationId,
                type: movementType,
                quantity: dto.quantity,
                unitPriceSnapshot: dto.unitPrice || 0,
                createdBy: 'mobile-app',
            },
        });
        return movement;
    }
    async getStockBalances() {
        const rows = await this.prisma.inventoryMovement.findMany({
            select: { productId: true, type: true, quantity: true, locationId: true },
        });
        const balances = {};
        rows.forEach((row) => {
            const key = row.productId;
            const current = balances[key] || 0;
            if (['RETIRADA', 'VENDA'].includes(row.type)) {
                balances[key] = current - row.quantity;
            }
            else {
                balances[key] = current + row.quantity;
            }
        });
        return balances;
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
    async ensureInventoryLocation(locationId) {
        const existing = await this.prisma.inventoryLocation.findUnique({
            where: { id: locationId },
        });
        if (existing) {
            return existing;
        }
        return this.prisma.inventoryLocation.create({
            data: {
                id: locationId,
                name: 'Estoque Homolog',
                affectsFinancial: true,
            },
        });
    }
    async ensureProduct(dto) {
        const existing = await this.prisma.product.findUnique({ where: { id: dto.productId } });
        if (existing) {
            return existing;
        }
        return this.prisma.product.create({
            data: {
                id: dto.productId,
                name: dto.productName || dto.productId,
                line: dto.productLine || 'Bymen',
                capacity: dto.productCapacity || '',
                type: dto.productType || 'GERAL',
                basePrice: dto.unitPrice || 0,
                suggestedPrice: dto.suggestedPrice || dto.unitPrice || 0,
            },
        });
    }
};
exports.HomologService = HomologService;
exports.HomologService = HomologService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HomologService);
//# sourceMappingURL=homolog.service.js.map