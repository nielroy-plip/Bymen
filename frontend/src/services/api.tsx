import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, CLIENTS } from '../data/clients';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

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

export type MeasurementStatus = 'DRAFT' | 'FINALIZED' | 'SIGNED';
export type MeasurementSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export type MeasurementTimelineEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
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
  status?: MeasurementStatus;
  syncStatus?: MeasurementSyncStatus;
  createdAt?: string;
  updatedAt?: string;
  timeline?: MeasurementTimelineEvent[];
  financeiro?: {
    notaFiscalId?: string;
    boletoUrl?: string;
    valorTotal: number;
  };
};

export type SyncPendingItem = {
  id: string;
  entityType: 'MEDICAO';
  entityId: string;
  endpoint: string;
  method: 'POST' | 'PUT';
  payload: any;
  reason: string;
  createdAt: string;
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
const SYNC_QUEUE_KEY = 'bymen_sync_queue';
const CURRENT_USER_KEY = 'bymen_current_user';

export type AppUser = {
  id?: string;
  email: string;
  role?: string;
  username?: string;
  phone?: string;
};

type UserRegistryItem = {
  email: string;
  username?: string;
  phone?: string;
};

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

async function readSyncQueue(): Promise<SyncPendingItem[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as SyncPendingItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeSyncQueue(items: SyncPendingItem[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export async function saveCurrentUserProfile(partial: Partial<AppUser>) {
  const current = await getCurrentUser();
  if (!current) return null;

  const updated = await homologRequest<AppUser>('/homolog/users/profile/update', {
    method: 'POST',
    body: JSON.stringify({
      email: current.email,
      username: partial.username,
      phone: partial.phone,
    }),
  });

  const next = {
    ...current,
    ...updated,
  };
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(next));
  return next;
}

async function homologRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const txt = await response.text();
    try {
      const parsed = txt ? JSON.parse(txt) : null;
      const message = Array.isArray(parsed?.message)
        ? parsed.message.join(', ')
        : parsed?.message || parsed?.error || txt;
      throw new Error(message || `HTTP ${response.status}`);
    } catch {
      throw new Error(txt || `HTTP ${response.status}`);
    }
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export async function registerUser(input: { email: string; password: string; username?: string; phone?: string }) {
  const payload = {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    username: input.username?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
  };

  return homologRequest('/homolog/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(input: { identifier: string; password: string }) {
  const result = await homologRequest<{ id: string; email: string; role: string; username?: string; phone?: string }>(
    '/homolog/users/login',
    {
    method: 'POST',
    body: JSON.stringify({ identifier: input.identifier.trim().toLowerCase(), password: input.password }),
  },
  );

  const currentUser: AppUser = {
    id: result.id,
    email: result.email,
    role: result.role,
    username: result.username,
    phone: result.phone,
  };
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  return currentUser;
}

export async function changeUserPassword(input: { email: string; currentPassword: string; newPassword: string }) {
  return homologRequest('/homolog/users/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listClients() {
  const local = await readClients();

  try {
    const remote = await homologRequest<Client[]>('/homolog/clients');
    if (Array.isArray(remote) && remote.length > 0) {
      const onlyCustom = remote.filter((c) => !CLIENTS.find((base) => base.id === c.id));
      await writeClients(onlyCustom);
      return [...onlyCustom, ...CLIENTS];
    }
  } catch (error) {
    console.warn('Falha ao buscar clientes remotos, usando local:', error);
  }

  return local;
}

export async function saveClient(client: Client) {
  const all = await readClients();
  const existing = all.find(c => c.id === client.id);
  if (existing) {
    const updated = all.map(c => c.id === client.id ? client : c);
    await writeClients(updated.filter(c => !CLIENTS.find(base => base.id === c.id)));
    await homologRequest('/homolog/clients/upsert', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return client;
  }
  const next = [client, ...all.filter(c => !CLIENTS.find(base => base.id === c.id))];
  await writeClients(next);
  await homologRequest('/homolog/clients/upsert', {
    method: 'POST',
    body: JSON.stringify(client),
  });
  return client;
}

export async function deleteClient(clientId: string) {
  const all = await readClients();
  const nextClients = all.filter((c) => c.id !== clientId);
  await writeClients(nextClients.filter(c => !CLIENTS.find(base => base.id === c.id)));

  const allMeasurements = await readAll();
  const nextMeasurements = allMeasurements.filter((m) => m.clientId !== clientId);
  await writeAll(nextMeasurements);

  const clientStock = await readClientStock();
  if (clientStock[clientId]) {
    delete clientStock[clientId];
    await writeClientStock(clientStock);
  }

  try {
    await homologRequest(`/homolog/clients/${clientId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.warn('Falha ao excluir cliente remoto em homologação:', error);
    throw error;
  }
}

export async function listProducts() {
  const stock = await readStock();
  // Inclui produtos normais e de bancada na listagem
  const allProducts = [...PRODUCTS, ...PRODUTOS_BANCADA];

  try {
    const remoteBalances = await homologRequest<Record<string, number>>('/homolog/stock/balances');
    return allProducts.map((p) => ({
      ...p,
      estoque: remoteBalances[p.id] ?? stock[p.id] ?? p.estoque,
    }));
  } catch (error) {
    console.warn('Falha ao buscar estoque remoto, usando local:', error);
    return allProducts.map(p => ({ ...p, estoque: stock[p.id] ?? p.estoque }));
  }
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

  const product = allProducts.find((p) => p.id === productId);
  await homologRequest('/homolog/stock/movement', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      quantity,
      type: 'ENTRADA',
      unitPrice: product?.preco || 0,
      suggestedPrice: product?.precoSugestao || product?.preco || 0,
      productName: product?.nome || productId,
      productLine: product?.linha || 'Bymen',
      productCapacity: String(product?.cap ?? ''),
      productType: productId.startsWith('b') ? 'BANCADA' : 'PRODUTO',
    }),
  });
}

export async function removeProductStock(productId: string, quantity: number): Promise<boolean> {
  const stock = await readStock();
  const allProducts = [...PRODUCTS, ...PRODUTOS_BANCADA];
  const current = stock[productId] ?? allProducts.find(p => p.id === productId)?.estoque ?? 0;
  if (current >= quantity) {
    stock[productId] = current - quantity;
    await writeStock(stock);

    const product = allProducts.find((p) => p.id === productId);
    await homologRequest('/homolog/stock/movement', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        quantity,
        type: 'SAIDA',
        unitPrice: product?.preco || 0,
        suggestedPrice: product?.precoSugestao || product?.preco || 0,
        productName: product?.nome || productId,
        productLine: product?.linha || 'Bymen',
        productCapacity: String(product?.cap ?? ''),
        productType: productId.startsWith('b') ? 'BANCADA' : 'PRODUTO',
      }),
    });
    return true;
  }
  return false; // Insufficient stock
}

export async function saveMeasurement(m: Measurement) {
  const now = new Date().toISOString();
  const timeline = Array.isArray(m.timeline)
    ? m.timeline
    : [
        {
          id: `${m.id}-created`,
          type: 'CREATED',
          message: 'Medição criada no app',
          createdAt: now,
        },
      ];

  const normalized: Measurement = {
    ...m,
    status: m.status || 'FINALIZED',
    syncStatus: m.syncStatus || 'PENDING',
    createdAt: m.createdAt || now,
    updatedAt: now,
    timeline,
  };

  const all = await readAll();
  const withoutCurrent = all.filter((item) => item.id !== normalized.id);
  const next = [normalized, ...withoutCurrent];
  await writeAll(next);
  
  // Atualizar estoque do cliente com base na medição (produtos vendidos)
  const clientStock = await readClientStock();
  const updatedStock = { ...clientStock };
  const currentClientStock = { ...(updatedStock[normalized.clientId] || {}) };
  
  normalized.medicaoRows.forEach((r) => {
    currentClientStock[r.id] = r.novoEstoque;
  });
  
  updatedStock[normalized.clientId] = currentClientStock;
  await writeClientStock(updatedStock);

  try {
    await homologRequest('/homolog/measurements/upsert', {
      method: 'POST',
      body: JSON.stringify(normalized),
    });
  } catch {
    await enqueueSyncPending({
      entityType: 'MEDICAO',
      entityId: normalized.id,
      endpoint: `${API_BASE_URL}/homolog/measurements/upsert`,
      method: 'POST',
      payload: normalized,
      reason: 'Falha ao persistir medição no Supabase (homologação)',
    });
  }

  return normalized;
}

export async function listMeasurements(): Promise<Measurement[]> {
  const local = await readAll();

  try {
    const remote = await homologRequest<Measurement[]>('/homolog/measurements');
    if (Array.isArray(remote) && remote.length > 0) {
      await writeAll(remote);
      return remote;
    }
  } catch (error) {
    console.warn('Falha ao buscar medições remotas, usando local:', error);
  }

  return local;
}

export async function updateMeasurementPdf(id: string, pdfUri: string) {
  const all = await readAll();
  const next = all.map((m) =>
    m.id === id
      ? {
          ...m,
          pdfUri,
          updatedAt: new Date().toISOString(),
          timeline: [
            ...(m.timeline || []),
            {
              id: `${id}-pdf-${Date.now()}`,
              type: 'PDF_GENERATED',
              message: 'PDF gerado para medição',
              createdAt: new Date().toISOString(),
            },
          ],
        }
      : m
  );
  await writeAll(next);
}

export async function updateMeasurementSyncStatus(
  id: string,
  syncStatus: MeasurementSyncStatus,
  message: string,
  status?: MeasurementStatus,
) {
  const all = await readAll();
  const next = all.map((m) =>
    m.id === id
      ? {
          ...m,
          syncStatus,
          status: status || m.status,
          updatedAt: new Date().toISOString(),
          timeline: [
            ...(m.timeline || []),
            {
              id: `${id}-sync-${Date.now()}`,
              type: syncStatus === 'SYNCED' ? 'SYNC_SUCCESS' : 'SYNC_FAILED',
              message,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      : m,
  );
  await writeAll(next);
}

export async function enqueueSyncPending(item: Omit<SyncPendingItem, 'id' | 'createdAt'>) {
  const queue = await readSyncQueue();
  const next: SyncPendingItem = {
    ...item,
    id: `${item.entityId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await writeSyncQueue([next, ...queue]);
  return next;
}

export async function listSyncPending(): Promise<SyncPendingItem[]> {
  return readSyncQueue();
}

export async function removeSyncPending(id: string) {
  const queue = await readSyncQueue();
  await writeSyncQueue(queue.filter((item) => item.id !== id));
}

// ========================================
// FUNÇÃO PARA POPULAR DADOS DE EXEMPLO
// ========================================
export async function seedExampleMeasurements() {
  return;
}
