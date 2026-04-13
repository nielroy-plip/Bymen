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
  clientName?: string;
  dateTime: string;
  // Tabela 1: Medição (produtos vendidos)
  medicaoRows: MedicaoRow[];
  valorMedicao: number;
  // Tabela 2: Bancada (produtos de uso interno)
  bancadaRows: BancadaRow[];
  bonusRows?: BancadaRow[];
  valorBancada: number;
  // Totais
  totalGeral: number; // valorMedicao + valorBancada
  // Metadados
  pdfUri?: string;
  responsavel?: string;
  observacoes?: string;
  pagamentoPix?: boolean;
  paymentMethod?: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';
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

export type SaleItem = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoBase?: number;
  preco5?: number;
  preco10?: number;
  faixaPrecoAplicada?: 'BASE' | 'QTD_5' | 'QTD_10';
  quantidade: number;
  valorTotal: number;
};

export type Sale = {
  id: string;
  clientId: string;
  clientName: string;
  dateTime: string;
  items: SaleItem[];
  subtotal?: number;
  pixDiscountPercent?: number;
  pixDiscountValue?: number;
  total: number;
  paymentMethod?: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';
  responsavel?: string;
  observacoes?: string;
  signatureDataUrl?: string;
  createdAt: string;
};

export type SyncPendingItem = {
  id: string;
  entityType: 'MEDICAO' | 'VENDA';
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
const SALES_KEY = 'bymen_sales';
const STOCK_KEY = 'bymen_stock';
const CLIENT_STOCK_KEY = 'bymen_client_stock';
const CLIENTS_KEY = 'bymen_clients';
const SYNC_QUEUE_KEY = 'bymen_sync_queue';
const CURRENT_USER_KEY = 'bymen_current_user';
const CUSTOM_PRODUCTS_KEY = 'bymen_custom_products';

const STOCK_REMOTE_REFRESH_INTERVAL_MS = 15000;
let lastStockRemoteFetchAt = 0;
let stockRemoteBlockedUntil = 0;

function formatCpfCnpj(value: string) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyClientMasks(client: Client): Client {
  return {
    ...client,
    cnpjCpf: formatCpfCnpj(client.cnpjCpf || ''),
    telefone: formatPhone(client.telefone || ''),
  };
}

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

function formatUserFacingError(rawMessage: string, status?: number) {
  const normalized = (rawMessage || '').toLowerCase();

  if (normalized.includes('network request failed') || normalized.includes('failed to fetch')) {
    return 'Motivo: não foi possível conectar ao servidor. Como ajustar: verifique sua internet e confirme se o backend está online.';
  }

  if (status === 400 || normalized.includes('validation failed')) {
    return `Motivo: dados inválidos enviados para homologação (${rawMessage}). Como ajustar: revise os campos obrigatórios e tente novamente.`;
  }

  if (status === 401 || normalized.includes('credenciais inválidas')) {
    return 'Motivo: autenticação inválida. Como ajustar: confira usuário/e-mail e senha, depois tente novamente.';
  }

  if (status === 409 || normalized.includes('já cadastrado')) {
    return `Motivo: conflito de cadastro (${rawMessage}). Como ajustar: use outro valor para o campo informado e tente novamente.`;
  }

  if (status === 503 || normalized.includes('service unavailable')) {
    return 'Motivo: serviço indisponível no momento. Como ajustar: aguarde alguns segundos e tente novamente.';
  }

  return `Motivo: ${rawMessage || 'erro inesperado no servidor'}. Como ajustar: tente novamente e, se persistir, valide a configuração da homologação.`;
}

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

async function readCustomProducts(): Promise<Product[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_PRODUCTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCustomProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(products));
}

async function getAllProducts(): Promise<Product[]> {
  const custom = await readCustomProducts();
  return [...PRODUCTS, ...PRODUTOS_BANCADA, ...custom];
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

async function readSales(): Promise<Sale[]> {
  const raw = await AsyncStorage.getItem(SALES_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Sale[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeSales(items: Sale[]): Promise<void> {
  await AsyncStorage.setItem(SALES_KEY, JSON.stringify(items));
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });
  } catch (error) {
    throw new Error(formatUserFacingError((error as Error)?.message || 'falha de conexão'));
  }

  if (!response.ok) {
    const txt = await response.text();
    let rawMessage = txt || `HTTP ${response.status}`;

    try {
      const parsed = txt ? JSON.parse(txt) : null;
      rawMessage = Array.isArray(parsed?.message)
        ? parsed.message.join(', ')
        : parsed?.message || parsed?.error || txt;
    } catch {
      rawMessage = txt || `HTTP ${response.status}`;
    }

    throw new Error(formatUserFacingError(rawMessage, response.status));
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export async function registerUser(input: { email: string; password: string; username: string; phone: string }) {
  const payload = {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    username: input.username.trim(),
    phone: input.phone.trim(),
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
      const localById = new Map(local.map((c) => [c.id, c]));
      const pickLocalText = (remoteValue: string | undefined, localValue: string | undefined) => {
        const localText = String(localValue || '').trim();
        if (localText.length > 0) return localText;
        return String(remoteValue || '').trim();
      };

      const mergedRemote = remote.map((c) => ({
        ...c,
        nome: pickLocalText(c.nome, localById.get(c.id)?.nome),
        telefone: pickLocalText(c.telefone, localById.get(c.id)?.telefone),
        cnpjCpf: pickLocalText(c.cnpjCpf, localById.get(c.id)?.cnpjCpf),
        endereco: pickLocalText(c.endereco, localById.get(c.id)?.endereco),
        responsavel: pickLocalText(c.responsavel, localById.get(c.id)?.responsavel),
        cep: c.cep || localById.get(c.id)?.cep || '',
        operationMode: c.operationMode || localById.get(c.id)?.operationMode || 'CONSIGNADO',
      }));

      const onlyCustom = mergedRemote.filter((c) => !CLIENTS.find((base) => base.id === c.id));
      await writeClients(onlyCustom);
      return [...onlyCustom, ...CLIENTS].map(applyClientMasks);
    }
  } catch (error) {
    console.warn('Falha ao buscar clientes remotos, usando local:', error);
  }

  return local.map(applyClientMasks);
}

export async function saveClient(client: Client) {
  const payload = {
    id: client.id,
    nome: client.nome,
    telefone: client.telefone,
    cnpjCpf: client.cnpjCpf || '',
    cep: client.cep || '',
    endereco: client.endereco || '',
    responsavel: client.responsavel || '',
  };

  const all = await readClients();
  const normalizedIncomingDoc = String(client.cnpjCpf || '').replace(/\D/g, '');
  const duplicate = all.find((c) => {
    const normalizedExistingDoc = String(c.cnpjCpf || '').replace(/\D/g, '');
    const sameDocument = normalizedExistingDoc.length > 0 && normalizedExistingDoc === normalizedIncomingDoc;
    const differentClient = c.id !== client.id;
    return sameDocument && differentClient;
  });

  if (duplicate) {
    throw new Error('Já existe uma barbearia cadastrada com este CNPJ/CPF.');
  }

  const normalizedClient: Client = {
    ...client,
    operationMode: client.operationMode || 'CONSIGNADO',
  };

  const existing = all.find(c => c.id === normalizedClient.id);
  if (existing) {
    const updated = all.map(c => c.id === normalizedClient.id ? normalizedClient : c);
    await writeClients(updated.filter(c => !CLIENTS.find(base => base.id === c.id)));
    try {
      await homologRequest('/homolog/clients/upsert', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('Falha ao salvar cliente remoto, mantendo persistência local:', error);
    }
    return normalizedClient;
  }
  const next = [normalizedClient, ...all.filter(c => !CLIENTS.find(base => base.id === c.id))];
  await writeClients(next);
  try {
    await homologRequest('/homolog/clients/upsert', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Falha ao salvar cliente remoto, mantendo persistência local:', error);
  }
  return normalizedClient;
}

export async function saveSale(sale: Sale) {
  const all = await readSales();
  const next = [sale, ...all.filter((s) => s.id !== sale.id)];
  await writeSales(next);

  try {
    await homologRequest('/homolog/sales/upsert', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  } catch {
    await enqueueSyncPending({
      entityType: 'VENDA',
      entityId: sale.id,
      endpoint: `${API_BASE_URL}/homolog/sales/upsert`,
      method: 'POST',
      payload: sale,
      reason: 'Falha ao persistir venda na homologação',
    });
  }

  try {
    await homologRequest(`/integrations/bling/vendas/${sale.id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({
        localClientId: sale.clientId,
        items: (sale.items || []).map((item) => ({
          productId: item.id,
          quantity: Number(item.quantidade || 0),
          unitPrice: Number(item.preco || 0),
        })),
      }),
    });
  } catch {
    await enqueueSyncPending({
      entityType: 'VENDA',
      entityId: sale.id,
      endpoint: `${API_BASE_URL}/integrations/bling/vendas/${sale.id}/finalize`,
      method: 'POST',
      payload: {
        localClientId: sale.clientId,
        items: (sale.items || []).map((item) => ({
          productId: item.id,
          quantity: Number(item.quantidade || 0),
          unitPrice: Number(item.preco || 0),
        })),
      },
      reason: 'Falha ao enviar venda para o Bling',
    });
  }

  return sale;
}

export async function listSales() {
  return readSales();
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
  const localStock = await readStock();
  // Inclui produtos base e personalizados (produto e bancada)
  const allProducts = await getAllProducts();

  const now = Date.now();
  const isInRefreshWindow = now - lastStockRemoteFetchAt < STOCK_REMOTE_REFRESH_INTERVAL_MS;
  const isRemoteBlocked = now < stockRemoteBlockedUntil;

  if (isInRefreshWindow || isRemoteBlocked) {
    return allProducts.map((p) => ({
      ...p,
      estoque: localStock[p.id] ?? 0,
    }));
  }

  try {
    const remoteBalances = await homologRequest<Record<string, number>>('/homolog/stock/balances');
    const mergedCache = { ...localStock, ...remoteBalances };
    await writeStock(mergedCache);
    lastStockRemoteFetchAt = now;

    return allProducts.map((p) => ({
      ...p,
      estoque: remoteBalances[p.id] ?? localStock[p.id] ?? 0,
    }));
  } catch (error) {
    const message = String((error as Error)?.message || '').toLowerCase();
    const isRateLimited = message.includes('too many requests');

    if (!isRateLimited) {
      console.warn('Falha ao buscar estoque remoto, usando local:', error);
    } else {
      // Evita rajadas de chamadas quando o backend responde 429.
      stockRemoteBlockedUntil = now + 60000;
    }

    return allProducts.map(p => ({ ...p, estoque: localStock[p.id] ?? 0 }));
  }
}

export async function listProductsForClient(clientId: string) {
  const clientStock = await readClientStock();
  const stock = clientStock[clientId] || {};
  const allMeasurements = await readAll();
  const latestMeasurement = allMeasurements
    .filter((m) => m.clientId === clientId)
    .sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || a.dateTime || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || b.dateTime || 0).getTime();
      return tb - ta;
    })[0];

  const latestMeasurementStock: Record<string, number> = {};
  (latestMeasurement?.medicaoRows || []).forEach((row) => {
    latestMeasurementStock[row.id] = row.novoEstoque;
  });

  const allProducts = await getAllProducts();
  const consignadoProducts = allProducts.filter((p) => !p.id.startsWith('b'));

  return consignadoProducts.map((p) => ({
    ...p,
    estoque: stock[p.id] ?? latestMeasurementStock[p.id] ?? 0,
  }));
}

export type NewProductPayload = {
  nome: string;
  linha: string;
  cap: number;
  precoVenda: number;
  precoConsignado: number;
  tipo: 'PRODUTO' | 'BANCADA';
};

export async function createProduct(payload: NewProductPayload): Promise<Product> {
  const nome = String(payload.nome || '').trim();
  const linha = String(payload.linha || '').trim();
  const cap = Number(payload.cap || 0);
  const precoVenda = Number(payload.precoVenda || 0);
  const precoConsignado = Number(payload.precoConsignado || 0);
  const tipo = payload.tipo === 'BANCADA' ? 'BANCADA' : 'PRODUTO';

  if (!nome || !linha || cap <= 0 || precoVenda <= 0 || precoConsignado <= 0) {
    throw new Error('Dados do produto inválidos. Preencha nome, linha, capacidade e valores maiores que zero.');
  }

  const allProducts = await getAllProducts();
  const duplicate = allProducts.find(
    (item) =>
      item.nome.trim().toLowerCase() === nome.toLowerCase() &&
      item.linha.trim().toLowerCase() === linha.toLowerCase() &&
      Number(item.cap) === cap &&
      (item.id.startsWith('b') ? 'BANCADA' : 'PRODUTO') === tipo,
  );

  if (duplicate) {
    throw new Error('Já existe um produto com esse nome, linha, capacidade e tipo.');
  }

  const idPrefix = tipo === 'BANCADA' ? 'b' : 'p';
  const id = `${idPrefix}c${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;

  const nextProduct: Product = {
    id,
    nome,
    linha,
    cap,
    // Mantém compatibilidade dos fluxos existentes:
    // preco = consignado | precoSugestao = venda
    preco: precoConsignado,
    precoSugestao: precoVenda,
    estoque: 0,
  };

  const custom = await readCustomProducts();
  custom.push(nextProduct);
  await writeCustomProducts(custom);

  const stock = await readStock();
  if (typeof stock[id] !== 'number') {
    stock[id] = 0;
    await writeStock(stock);
  }

  return nextProduct;
}

export async function deleteProduct(productId: string): Promise<void> {
  const custom = await readCustomProducts();
  const existsInCustom = custom.some((item) => item.id === productId);

  if (!existsInCustom) {
    throw new Error('Apenas produtos personalizados podem ser excluídos.');
  }

  const nextCustom = custom.filter((item) => item.id !== productId);
  await writeCustomProducts(nextCustom);

  const stock = await readStock();
  if (Object.prototype.hasOwnProperty.call(stock, productId)) {
    delete stock[productId];
    await writeStock(stock);
  }

  const clientStock = await readClientStock();
  let changed = false;

  Object.keys(clientStock).forEach((clientId) => {
    if (Object.prototype.hasOwnProperty.call(clientStock[clientId], productId)) {
      delete clientStock[clientId][productId];
      changed = true;
    }
  });

  if (changed) {
    await writeClientStock(clientStock);
  }
}

async function getCurrentDistributorBalance(productId: string, localStock: Record<string, number>) {
  if (typeof localStock[productId] === 'number') {
    return localStock[productId];
  }

  try {
    const remoteBalances = await homologRequest<Record<string, number>>('/homolog/stock/balances');
    const merged = { ...localStock, ...remoteBalances };
    await writeStock(merged);
    return remoteBalances[productId] ?? merged[productId] ?? 0;
  } catch {
    return localStock[productId] ?? 0;
  }
}

export async function addClientInitialStock(
  clientId: string,
  payload: { estoque: Record<string, string>; bancada?: Record<string, string> },
) {
  const clientStock = await readClientStock();
  const current = { ...(clientStock[clientId] || {}) };

  const applyEntries = (entries: Record<string, string> | undefined) => {
    Object.entries(entries || {}).forEach(([productId, value]) => {
      const qty = Number(value || 0);
      if (qty > 0) {
        current[productId] = (current[productId] || 0) + qty;
      }
    });
  };

  applyEntries(payload.estoque);
  applyEntries(payload.bancada);

  clientStock[clientId] = current;
  await writeClientStock(clientStock);
  return current;
}

export async function addProductStock(productId: string, quantity: number) {
  const stock = await readStock();
  const allProducts = await getAllProducts();
  const current = await getCurrentDistributorBalance(productId, stock);
  stock[productId] = current + quantity;
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
  const allProducts = await getAllProducts();
  const current = await getCurrentDistributorBalance(productId, stock);
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

async function retrofitMeasurementClientNames(items: Measurement[]): Promise<Measurement[]> {
  if (!Array.isArray(items) || items.length === 0) return items;

  const clients = await readClients();
  const byId = new Map(clients.map((c) => [c.id, c.nome]));

  let changed = false;
  const patched = items.map((item) => {
    if (item.clientName && item.clientName.trim().length > 0) {
      return item;
    }

    const name = byId.get(item.clientId);
    if (!name) {
      return item;
    }

    changed = true;
    return {
      ...item,
      clientName: name,
    };
  });

  if (changed) {
    await writeAll(patched);
  }

  return patched;
}

export async function listMeasurements(): Promise<Measurement[]> {
  const local = await readAll();

  try {
    const remote = await homologRequest<Measurement[]>('/homolog/measurements');
    if (Array.isArray(remote) && remote.length > 0) {
      const localById = new Map(local.map((m) => [m.id, m]));

      const mergedRemote = remote.map((remoteItem) => {
        const localItem = localById.get(remoteItem.id);
        if (!localItem) return remoteItem;

        return {
          ...remoteItem,
          clientName: remoteItem.clientName || localItem.clientName,
          bonusRows: remoteItem.bonusRows ?? localItem.bonusRows,
          observacoes: remoteItem.observacoes ?? localItem.observacoes,
          pagamentoPix: remoteItem.pagamentoPix ?? localItem.pagamentoPix,
          signatureDataUrl: remoteItem.signatureDataUrl || localItem.signatureDataUrl,
          responsavel: remoteItem.responsavel || localItem.responsavel,
          pdfUri: remoteItem.pdfUri || localItem.pdfUri,
        } as Measurement;
      });

      const remoteIds = new Set(mergedRemote.map((m) => m.id));
      const localOnly = local.filter((m) => !remoteIds.has(m.id));
      const merged = [...mergedRemote, ...localOnly];

      await writeAll(merged);
      return retrofitMeasurementClientNames(merged);
    }
  } catch (error) {
    console.warn('Falha ao buscar medições remotas, usando local:', error);
  }

  return retrofitMeasurementClientNames(local);
}

export async function updateMeasurementPdf(id: string, pdfUri: string) {
  const all = await readAll();
  let updatedMeasurement: Measurement | undefined;
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
  updatedMeasurement = next.find((m) => m.id === id);
  await writeAll(next);

  if (!updatedMeasurement) {
    return;
  }

  try {
    await homologRequest('/homolog/measurements/upsert', {
      method: 'POST',
      body: JSON.stringify(updatedMeasurement),
    });
  } catch {
    await enqueueSyncPending({
      entityType: 'MEDICAO',
      entityId: updatedMeasurement.id,
      endpoint: `${API_BASE_URL}/homolog/measurements/upsert`,
      method: 'POST',
      payload: updatedMeasurement,
      reason: 'Falha ao persistir atualização de PDF da medição no Supabase (homologação)',
    });
  }
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
