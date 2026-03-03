export function getProductUnit(productName: string): 'g' | 'ml' {
  const name = String(productName || '').toLowerCase();

  if (name.includes('pomada')) return 'g';
  if (name.includes('pó modelador') || name.includes('po modelador')) return 'g';

  return 'ml';
}
