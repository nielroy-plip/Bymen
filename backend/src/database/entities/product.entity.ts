export interface Product {
  id: string;
  name: string;
  line: string;
  capacity: string;
  type: 'VENDA' | 'BANCADA';
  basePrice: number;
  suggestedPrice: number;
  createdAt: Date;
}
