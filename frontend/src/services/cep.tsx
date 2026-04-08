export type CepResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

export function normalizeCep(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

export function formatCep(value: string) {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function findAddressByCep(rawCep: string): Promise<CepResult | null> {
  const cep = normalizeCep(rawCep);
  if (cep.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) {
    throw new Error('Falha ao consultar CEP.');
  }

  const data = await response.json();
  if (data?.erro) return null;

  return {
    cep: data.cep || formatCep(cep),
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    localidade: data.localidade || '',
    uf: data.uf || '',
  };
}
