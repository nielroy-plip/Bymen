import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from './database.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabasePrismaService extends DatabaseService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const facade = {
        getSaldoProdutoLocal: (productId: string, locationId: string) =>
          this.getSaldoProdutoLocal(productId, locationId, tx),
        createInventoryMovement: (data: any) => tx.inventoryMovement.create({ data }),
        createAuditLog: (data: any) => tx.auditLog.create({ data }),
      };

      return fn(facade);
    });
  }

  async getSaldoProdutoLocal(productId: string, locationId: string, tx?: Prisma.TransactionClient): Promise<number> {
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

  async createInventoryMovement(data: any): Promise<any> {
    return this.prisma.inventoryMovement.create({ data });
  }

  async createAuditLog(data: any): Promise<void> {
    await this.prisma.auditLog.create({ data });
  }

  async updateMedicaoWhereIdAndVersion(id: string, version: number, data: any): Promise<any> {
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
}
