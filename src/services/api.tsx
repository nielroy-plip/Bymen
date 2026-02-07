import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, CLIENTS } from '../data/clients';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';

// ========================================
// TIPOS LEGADOS (manter para compatibilidade)
// ========================================
export type MeasurementRow = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoSugestao?: number;
  estoqueAtual: number;
  vendidos: number;
  repostos: number;
  diferenca: number;
  novoEstoque: number;
  valorMedicao: number;
  naoVendidos?: number;
};

// ========================================
// TABELA 1: MEDIÇÃO (Produtos Vendidos)
// ========================================
export type MedicaoRow = {
  produtosRetirados: any;
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoSugestao?: number;
  estoqueAtual: number;
  vendidos: number;
  repostos: number;
  diferenca: number;
  novoEstoque: number;
  valorMedicao: number;
};

// ========================================
// TABELA 2: BANCADA (Produtos de Uso Interno)
// ========================================
export type BancadaRow = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  quantidadeComprada: number;
  valorTotal: number;
};

// ========================================
// MEDIÇÃO COMPLETA (armazena ambas as tabelas)
// ========================================
export type Measurement = {
  id: string;
  clientId: string;
  dateTime: string;
  // Tabela 1: Medição (produtos vendidos)
  medicaoRows: MedicaoRow[];
  valorMedicao: number;
  // Tabela 2: Bancada (produtos de uso interno)
  bancadaRows: BancadaRow[];
  valorBancada: number;
  // Totais
  totalGeral: number; // valorMedicao + valorBancada
  // Metadados
  pdfUri?: string;
  responsavel?: string;
  signatureDataUrl?: string;
  financeiro?: {
    notaFiscalId?: string;
    boletoUrl?: string;
    valorTotal: number;
  };
};

// ========================================
// TIPOS ANTIGOS (removidos, mas mantidos comentados)
// ========================================
export type ConsignedProductRow = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  quantidadeInicial: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  valorUnitario: number;
  valorTotal: number;
  novoEstoque: number;
};

export type PriceListRow = {
  id: string;
  servico: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

const KEY = 'bymen_measurements';
const STOCK_KEY = 'bymen_stock';
const CLIENT_STOCK_KEY = 'bymen_client_stock';
const CLIENTS_KEY = 'bymen_clients';

async function readStock(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(STOCK_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

async function writeStock(stock: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(stock));
}

async function readClientStock(): Promise<Record<string, Record<string, number>>> {
  const raw = await AsyncStorage.getItem(CLIENT_STOCK_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

async function writeClientStock(stock: Record<string, Record<string, number>>): Promise<void> {
  await AsyncStorage.setItem(CLIENT_STOCK_KEY, JSON.stringify(stock));
}

async function readClients(): Promise<Client[]> {
  const raw = await AsyncStorage.getItem(CLIENTS_KEY);
  if (!raw) return CLIENTS;
  try {
    const saved = JSON.parse(raw) as Client[];
    return [...saved, ...CLIENTS];
  } catch {
    return CLIENTS;
  }
}

async function writeClients(clients: Client[]): Promise<void> {
  await AsyncStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

async function readAll(): Promise<Measurement[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Measurement[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(items: Measurement[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function listClients() {
  return readClients();
}

export async function saveClient(client: Client) {
  const all = await readClients();
  const existing = all.find(c => c.id === client.id);
  if (existing) {
    const updated = all.map(c => c.id === client.id ? client : c);
    await writeClients(updated.filter(c => !CLIENTS.find(base => base.id === c.id)));
    return client;
  }
  const next = [client, ...all.filter(c => !CLIENTS.find(base => base.id === c.id))];
  await writeClients(next);
  return client;
}

export async function listProducts() {
  const stock = await readStock();
  // Inclui produtos normais e de bancada na listagem
  const allProducts = [...PRODUCTS, ...PRODUTOS_BANCADA];
  return allProducts.map(p => ({ ...p, estoque: stock[p.id] ?? p.estoque }));
}

export async function listProductsForClient(clientId: string) {
  const clientStock = await readClientStock();
  const stock = clientStock[clientId] || {};
  return PRODUCTS.map((p) => ({ ...p, estoque: stock[p.id] ?? p.estoque }));
}

export async function addProductStock(productId: string, quantity: number) {
  const stock = await readStock();
  // Busca em ambos os arrays para garantir produto encontrado
  const allProducts = [...PRODUCTS, ...PRODUTOS_BANCADA];
  stock[productId] = (stock[productId] ?? allProducts.find(p => p.id === productId)?.estoque ?? 0) + quantity;
  await writeStock(stock);
}

export async function removeProductStock(productId: string, quantity: number): Promise<boolean> {
  const stock = await readStock();
  const allProducts = [...PRODUCTS, ...PRODUTOS_BANCADA];
  const current = stock[productId] ?? allProducts.find(p => p.id === productId)?.estoque ?? 0;
  if (current >= quantity) {
    stock[productId] = current - quantity;
    await writeStock(stock);
    return true;
  }
  return false; // Insufficient stock
}

export async function saveMeasurement(m: Measurement) {
  const all = await readAll();
  const next = [m, ...all];
  await writeAll(next);
  
  // Atualizar estoque do cliente com base na medição (produtos vendidos)
  const clientStock = await readClientStock();
  const updatedStock = { ...clientStock };
  const currentClientStock = { ...(updatedStock[m.clientId] || {}) };
  
  m.medicaoRows.forEach((r) => {
    currentClientStock[r.id] = r.novoEstoque;
  });
  
  updatedStock[m.clientId] = currentClientStock;
  await writeClientStock(updatedStock);
  return m;
}

export async function listMeasurements(): Promise<Measurement[]> {
  return readAll();
}

export async function updateMeasurementPdf(id: string, pdfUri: string) {
  const all = await readAll();
  const next = all.map((m) => (m.id === id ? { ...m, pdfUri } : m));
  await writeAll(next);
}

// ========================================
// FUNÇÃO PARA POPULAR DADOS DE EXEMPLO
// ========================================
export async function seedExampleMeasurements() {
  const clients = await listClients();
  if (clients.length === 0) return;

  const exampleMeasurements: Measurement[] = [
    // Janeiro 2026
    {
      id: 'example-1',
      clientId: clients[0].id,
      dateTime: '15/01/2026 14:30',
      medicaoRows: [
        {
          id: 'p1', nome: 'Shampoo', linha: 'Wood', cap: 240, preco: 39.9, precoSugestao: 69.9, estoqueAtual: 50, vendidos: 20, repostos: 10, diferenca: 30, novoEstoque: 40, valorMedicao: 798,
          produtosRetirados: undefined
        },
        {
          id: 'p2', nome: 'Condicionador', linha: 'Wood', cap: 140, preco: 34.9, precoSugestao: 59.9, estoqueAtual: 30, vendidos: 15, repostos: 5, diferenca: 15, novoEstoque: 20, valorMedicao: 523.5,
          produtosRetirados: undefined
        }
      ],
      bancadaRows: [
        { id: 'b1', nome: 'Shampoo', linha: 'Wood', cap: 1000, preco: 89.9, quantidadeComprada: 2, valorTotal: 179.8 }
      ],
      valorMedicao: 1321.5,
      valorBancada: 179.8,
      totalGeral: 1501.3
    },
    // Dezembro 2025
    {
      id: 'example-2',
      clientId: clients[0].id,
      dateTime: '10/12/2025 16:00',
      medicaoRows: [
        {
          id: 'p1', nome: 'Shampoo', linha: 'Wood', cap: 240, preco: 39.9, precoSugestao: 69.9, estoqueAtual: 60, vendidos: 25, repostos: 15, diferenca: 35, novoEstoque: 50, valorMedicao: 997.5,
          produtosRetirados: undefined
        }
      ],
      bancadaRows: [],
      valorMedicao: 997.5,
      valorBancada: 0,
      totalGeral: 997.5
    },
    // Novembro 2025
    {
      id: 'example-3',
      clientId: clients.length > 1 ? clients[1].id : clients[0].id,
      dateTime: '20/11/2025 10:15',
      medicaoRows: [
        {
          id: 'p3', nome: 'Energizador', linha: 'Ocean', cap: 140, preco: 44.9, precoSugestao: 74.9, estoqueAtual: 40, vendidos: 18, repostos: 8, diferenca: 22, novoEstoque: 30, valorMedicao: 808.2,
          produtosRetirados: undefined
        },
        {
          id: 'p4', nome: 'Balm de Barba', linha: 'Wood', cap: 140, preco: 49.9, precoSugestao: 79.9, estoqueAtual: 35, vendidos: 12, repostos: 7, diferenca: 23, novoEstoque: 30, valorMedicao: 598.8,
          produtosRetirados: undefined
        }
      ],
      bancadaRows: [
        { id: 'b2', nome: 'Gel de Barbear', linha: 'Wood', cap: 1000, preco: 94.9, quantidadeComprada: 1, valorTotal: 94.9 }
      ],
      valorMedicao: 1407,
      valorBancada: 94.9,
      totalGeral: 1501.9
    },
    // Outubro 2025
    {
      id: 'example-4',
      clientId: clients[0].id,
      dateTime: '05/10/2025 13:45',
      medicaoRows: [
        {
          id: 'p6', nome: 'Óleo de Barba', linha: 'Wood', cap: 30, preco: 54.9, precoSugestao: 89.9, estoqueAtual: 25, vendidos: 10, repostos: 5, diferenca: 15, novoEstoque: 20, valorMedicao: 549,
          produtosRetirados: undefined
        }
      ],
      bancadaRows: [],
      valorMedicao: 549,
      valorBancada: 0,
      totalGeral: 549
    }
  ];

  await writeAll(exampleMeasurements);
}
