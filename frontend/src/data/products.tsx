import { Product } from '../components/ProductRow';

export const PRODUCTS: Product[] = [
  { id: 'p1', nome: 'Shampoo 2x1', linha: 'Wood', cap: 240, preco: 42.0, preco5: 39.9, preco10: 37.8, precoSugestao: 65.0, estoque: 0 },
  { id: 'p2', nome: 'Shampoo 2x1', linha: 'Ocean', cap: 240, preco: 42.0, preco5: 39.9, preco10: 37.8, precoSugestao: 65.0, estoque: 0 },
  { id: 'p3', nome: 'Condicionador', linha: 'Wood', cap: 140, preco: 34.0, preco5: 32.3, preco10: 30.6, precoSugestao: 55.0, estoque: 0 },
  { id: 'p4', nome: 'Condicionador', linha: 'Ocean', cap: 140, preco: 34.0, preco5: 32.3, preco10: 30.6, precoSugestao: 55.0, estoque: 0 },
  { id: 'p5', nome: 'Balm de Barba', linha: 'Wood', cap: 140, preco: 38.0, preco5: 36.1, preco10: 34.2, precoSugestao: 60.0, estoque: 0 },
  { id: 'p6', nome: 'Balm de Barba', linha: 'Ocean', cap: 140, preco: 38.0, preco5: 36.1, preco10: 34.2, precoSugestao: 60.0, estoque: 0 },
  { id: 'p7', nome: 'Óleo de Barba', linha: 'Wood', cap: 30, preco: 45.0, preco5: 42.75, preco10: 40.5, precoSugestao: 70.0, estoque: 0 },
  { id: 'p8', nome: 'Óleo de Barba', linha: 'Ocean', cap: 30, preco: 45.0, preco5: 42.75, preco10: 40.5, precoSugestao: 70.0, estoque: 0 },
  { id: 'p9', nome: 'Pomada Efeito Matte', linha: 'Wood', cap: 100, preco: 58.0, preco5: 55.1, preco10: 52.2, precoSugestao: 85.0, estoque: 0 },
  { id: 'p10', nome: 'Pomada Efeito Matte', linha: 'Ocean', cap: 100, preco: 58.0, preco5: 55.1, preco10: 52.2, precoSugestao: 85.0, estoque: 0 },
  { id: 'p11', nome: 'Pomada Efeito Brilho', linha: 'Wood', cap: 100, preco: 58.0, preco5: 55.1, preco10: 52.2, precoSugestao: 85.0, estoque: 0 },
  { id: 'p12', nome: 'Pomada Efeito Brilho', linha: 'Ocean', cap: 100, preco: 58.0, preco5: 55.1, preco10: 52.2, precoSugestao: 85.0, estoque: 0 },
  { id: 'p13', nome: 'Pó Modelador Efeito Matte', linha: 'Bymen', cap: 10, preco: 35.0, preco5: 33.25, preco10: 31.5, precoSugestao: 60.0, estoque: 0 },
  { id: 'p14', nome: 'Grooming Modelador', linha: 'Wood', cap: 240, preco: 48.0, preco5: 44.4, preco10: 40.8, precoSugestao: 75.0, estoque: 0 },
  { id: 'p15', nome: 'Leave-in', linha: 'Wood', cap: 240, preco: 44.0, preco5: 40.7, preco10: 37.4, precoSugestao: 69.0, estoque: 0 },
  { id: 'p16', nome: 'Esfoliante Facial', linha: 'Wood', cap: 240, preco: 45.0, preco5: 41.62, preco10: 38.25, precoSugestao: 70.0, estoque: 0 }
];

export const PRODUTOS_BANCADA: Product[] = [
  { id: 'b1', nome: 'Shampoo 2x1', linha: 'Wood', cap: 1000, preco: 52.0, estoque: 0 },
  { id: 'b2', nome: 'Gel de Barbear', linha: 'Wood', cap: 1000, preco: 58.0, estoque: 0 },
  { id: 'b3', nome: 'Condicionador 2x1', linha: 'Wood', cap: 500, preco: 42.0, estoque: 0 },
  { id: 'b4', nome: 'Balm de Barba', linha: 'Wood', cap: 500, preco: 46.0, estoque: 0 },
  { id: 'b5', nome: 'Pomada Efeito Matte', linha: 'Wood', cap: 100, preco: 44.0, estoque: 0 },
  { id: 'b6', nome: 'Pomada Efeito Matte', linha: 'Ocean', cap: 100, preco: 44.0, estoque: 0 },
  { id: 'b7', nome: 'Pomada Efeito Brilho', linha: 'Ocean', cap: 100, preco: 44.0, estoque: 0 },
  { id: 'b8', nome: 'Pomada Efeito Brilho', linha: 'Wood', cap: 100, preco: 44.0, estoque: 0 },
  { id: 'b9', nome: 'Pó Modelador Efeito Matte', linha: 'Bymen', cap: 10, preco: 27.0, estoque: 0 },
  { id: 'b10', nome: 'Óleo de Barba', linha: 'Wood', cap: 30, preco: 37.0, estoque: 0 },
  { id: 'b11', nome: 'Óleo de Barba', linha: 'Ocean', cap: 30, preco: 37.0, estoque: 0 },
  { id: 'b12', nome: 'Creme Pós-barba', linha: 'Wood', cap: 500, preco: 46.0, estoque: 0 },
  { id: 'b13', nome: 'Esfoliante', linha: 'Wood', cap: 240, preco: 45.0, preco5: 42.75, preco10: 40.5, estoque: 0 },
  { id: 'b14', nome: 'Leave-in', linha: 'Wood', cap: 240, preco: 44.0, preco5: 41.8, preco10: 39.6, estoque: 0 },
  { id: 'b15', nome: 'Grooming', linha: 'Wood', cap: 240, preco: 48.0, preco5: 45.6, preco10: 43.2, estoque: 0 }
];
