export type Client = {
  id: string;
  nome: string;
  cnpjCpf: string;
  cep?: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  responsavel: string;
  telefone: string;
  email?: string;
  operationMode?: 'CONSIGNADO' | 'VENDA';
};

export const CLIENTS: Client[] = [];
