export function computeNovoEstoque(estoqueAtual: number, vendidos: number, repostos: number) {
  return estoqueAtual - vendidos + repostos;
}

export function computeDiferenca(estoqueAtual: number, novoEstoque: number) {
  return estoqueAtual - novoEstoque;
}

export function sum(values: number[]) {
  return values.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}
