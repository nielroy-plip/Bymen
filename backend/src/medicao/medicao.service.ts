import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MedicaoService {
  constructor(private db: DatabaseService) {}

  async updateMedicao(id: string, version: number, data: any) {
    const updated = await this.db.updateMedicaoWhereIdAndVersion(id, version, data);
    if (!updated) throw new ConflictException('Conflito de versão ou medição assinada');
    return updated;
  }
}
