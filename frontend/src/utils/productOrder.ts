type ProductLike = {
  id?: string;
  nome?: string;
  linha?: string;
  cap?: number;
};

const LINE_ORDER = ['wood', 'ocean', 'bymen'];

const CATALOG_ORDER_RULES: Array<{ rank: number; patterns: string[] }> = [
  { rank: 1, patterns: ['shampoo'] },
  { rank: 2, patterns: ['gel de barbear', 'gel de barba', 'shaving gel'] },
  { rank: 3, patterns: ['condicionador'] },
  { rank: 4, patterns: ['balm de barba', 'balm'] },
  { rank: 5, patterns: ['creme pos barba', 'creme pós barba', 'pos-barba', 'pós-barba'] },
  { rank: 6, patterns: ['pomada efeito teia'] },
  { rank: 7, patterns: ['pomada efeito matte'] },
  { rank: 8, patterns: ['pomada efeito brilho'] },
  { rank: 9, patterns: ['po modelador', 'pó modelador', 'top modelador'] },
  { rank: 10, patterns: ['oleo de barba', 'óleo de barba', 'oleo'] },
  { rank: 11, patterns: ['esfoliante'] },
  { rank: 12, patterns: ['leave in', 'leave-in'] },
  { rank: 13, patterns: ['lcc'] },
  { rank: 14, patterns: ['grooming'] },
];

function normalizeText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCatalogOrderRankByName(name: string) {
  const normalized = normalizeText(name);

  for (const rule of CATALOG_ORDER_RULES) {
    if (rule.patterns.some((pattern) => normalized.includes(normalizeText(pattern)))) {
      return rule.rank;
    }
  }

  return 999;
}

function getLineRank(line?: string) {
  const normalized = normalizeText(line || '');
  const index = LINE_ORDER.findIndex((item) => normalized === item);
  return index >= 0 ? index : 999;
}

export function compareCatalogNames(aName: string, bName: string) {
  const rankDiff = getCatalogOrderRankByName(aName) - getCatalogOrderRankByName(bName);
  if (rankDiff !== 0) return rankDiff;

  return normalizeText(aName).localeCompare(normalizeText(bName), 'pt-BR', { sensitivity: 'base' });
}

export function compareByCatalogOrder<T extends ProductLike>(a: T, b: T) {
  const rankDiff = getCatalogOrderRankByName(String(a.nome || '')) - getCatalogOrderRankByName(String(b.nome || ''));
  if (rankDiff !== 0) return rankDiff;

  const lineDiff = getLineRank(a.linha) - getLineRank(b.linha);
  if (lineDiff !== 0) return lineDiff;

  const capDiff = Number(a.cap || 0) - Number(b.cap || 0);
  if (capDiff !== 0) return capDiff;

  return normalizeText(String(a.nome || '')).localeCompare(normalizeText(String(b.nome || '')), 'pt-BR', {
    sensitivity: 'base',
  });
}

export function sortByCatalogOrder<T extends ProductLike>(list: T[]): T[] {
  return [...list].sort(compareByCatalogOrder);
}
