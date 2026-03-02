export abstract class DatabaseService {
  abstract transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
  abstract getSaldoProdutoLocal(productId: string, locationId: string, tx?: any): Promise<number>;
  abstract createInventoryMovement(data: any): Promise<any>;
  abstract createAuditLog(data: any): Promise<void>;
  abstract updateMedicaoWhereIdAndVersion(id: string, version: number, data: any): Promise<any>;
}
