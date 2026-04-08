export type Client = {
  id: string;
  nome: string;
  cnpjCpf: string;
  cep?: string;
  endereco: string;
  responsavel: string;
  telefone: string;
  operationMode?: 'CONSIGNADO' | 'VENDA';
};

export const CLIENTS: Client[] = [];
