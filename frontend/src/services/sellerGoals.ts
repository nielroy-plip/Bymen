import AsyncStorage from '@react-native-async-storage/async-storage';

const SELLER_GOALS_KEY = 'bymen_seller_goals';

export type SellerGoalMap = Record<string, number>;

function normalizeCurrency(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Number(numeric.toFixed(2));
}

export async function getSellerGoals(): Promise<SellerGoalMap> {
  try {
    const raw = await AsyncStorage.getItem(SELLER_GOALS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as SellerGoalMap;
    if (!parsed || typeof parsed !== 'object') return {};

    const normalized: SellerGoalMap = {};
    Object.keys(parsed).forEach((key) => {
      normalized[key] = normalizeCurrency(parsed[key]);
    });

    return normalized;
  } catch {
    return {};
  }
}

export async function saveSellerGoal(sellerKey: string, goalValue: number): Promise<SellerGoalMap> {
  const current = await getSellerGoals();
  const key = String(sellerKey || '').trim().toLowerCase();
  if (!key) return current;

  const next = {
    ...current,
    [key]: normalizeCurrency(goalValue),
  };

  await AsyncStorage.setItem(SELLER_GOALS_KEY, JSON.stringify(next));
  return next;
}
