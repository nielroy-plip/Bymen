import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  constructor(private db: DatabaseService) {}

  async movimentarEstoque(dto: any, userId: string) {
    return this.db.transaction(async (tx) => {
      const saldo = await tx.getSaldoProdutoLocal(dto.productId, dto.locationId);

      if (['VENDA', 'RETIRADA'].includes(dto.tipo) && saldo < dto.quantidade) {
        throw new ConflictException('Estoque insuficiente');
      }

      const movimento = await tx.createInventoryMovement({
        ...dto,
        createdBy: userId,
      });

      await tx.createAuditLog({
        action: 'INVENTORY_MOVEMENT',
        userId,
        details: JSON.stringify(dto),
      });

      return movimento;
    });
  }
}
