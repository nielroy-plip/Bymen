export function formatCurrency(v: number) {
  try {
    let formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    // Garante que valores acima de 1.000,00 fiquem com ponto separador e vírgula decimal
    return formatted.replace(/\.(\d{3}),/, '.$1,');
  } catch {
    let val = v.toFixed(2).replace('.', ',');
    // Adiciona ponto separador para milhares
    val = val.replace(/(\d)(?=(\d{3})+,)/g, '$1.');
    return `R$ ${val}`;
  }
}

export function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
