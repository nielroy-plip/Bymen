import AsyncStorage from '@react-native-async-storage/async-storage';

const GENERAL_SETTINGS_KEY = 'bymen_general_settings';

export type GeneralSettings = {
  creditInstallmentMonthlyInterestPercent: number;
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  creditInstallmentMonthlyInterestPercent: 2.49,
};

function sanitizePercent(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_GENERAL_SETTINGS.creditInstallmentMonthlyInterestPercent;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return Number(numeric.toFixed(2));
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  try {
    const raw = await AsyncStorage.getItem(GENERAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_GENERAL_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<GeneralSettings>;
    return {
      creditInstallmentMonthlyInterestPercent: sanitizePercent(parsed.creditInstallmentMonthlyInterestPercent),
    };
  } catch {
    return DEFAULT_GENERAL_SETTINGS;
  }
}

export async function saveGeneralSettings(input: Partial<GeneralSettings>): Promise<GeneralSettings> {
  const current = await getGeneralSettings();
  const next: GeneralSettings = {
    creditInstallmentMonthlyInterestPercent: sanitizePercent(
      input.creditInstallmentMonthlyInterestPercent ?? current.creditInstallmentMonthlyInterestPercent,
    ),
  };

  await AsyncStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(next));
  return next;
}
