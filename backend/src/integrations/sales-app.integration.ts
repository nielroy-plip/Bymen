export abstract class SalesAppIntegration {
  abstract syncClient(data: any): Promise<any>;
  abstract syncProduct(data: any): Promise<void>;
  abstract syncInventory(data: any): Promise<any>;
  abstract createOrder(data: any): Promise<any>;
  abstract issueInvoice(data: any): Promise<any>;
}
