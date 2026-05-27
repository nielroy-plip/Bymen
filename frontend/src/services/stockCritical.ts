import AsyncStorage from '@react-native-async-storage/async-storage';

const STOCK_CRITICAL_THRESHOLDS_KEY = 'bymen_stock_critical_thresholds';
const DEFAULT_STOCK_CRITICAL_THRESHOLD = 10;

export type StockCriticalThresholds = Record<string, number>;

function normalizeThreshold(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STOCK_CRITICAL_THRESHOLD;
  if (numeric < 0) return 0;
  return Math.floor(numeric);
}

export function getDefaultStockCriticalThreshold(): number {
  return DEFAULT_STOCK_CRITICAL_THRESHOLD;
}

export async function getStockCriticalThresholds(): Promise<StockCriticalThresholds> {
  try {
    const raw = await AsyncStorage.getItem(STOCK_CRITICAL_THRESHOLDS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as StockCriticalThresholds;
    if (!parsed || typeof parsed !== 'object') return {};

    const normalized: StockCriticalThresholds = {};
    Object.keys(parsed).forEach((key) => {
      normalized[key] = normalizeThreshold(parsed[key]);
    });

    return normalized;
  } catch {
    return {};
  }
}

export function getProductCriticalThreshold(productId: string, thresholds: StockCriticalThresholds): number {
  const value = thresholds[String(productId || '')];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeThreshold(value);
  }

  return DEFAULT_STOCK_CRITICAL_THRESHOLD;
}

export async function saveProductCriticalThreshold(productId: string, threshold: number): Promise<StockCriticalThresholds> {
  const key = String(productId || '').trim();
  if (!key) return getStockCriticalThresholds();

  const current = await getStockCriticalThresholds();
  const next = {
    ...current,
    [key]: normalizeThreshold(threshold),
  };

  await AsyncStorage.setItem(STOCK_CRITICAL_THRESHOLDS_KEY, JSON.stringify(next));
  return next;
}
