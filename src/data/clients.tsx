export type Client = {
  id: string;
  nome: string;
  cnpjCpf: string;
  endereco: string;
  responsavel: string;
  telefone: string;
};

export const CLIENTS: Client[] = [
  {
    id: 'c1',
    nome: 'Barbearia Elite',
    cnpjCpf: '12.345.678/0001-10',
    endereco: 'Rua das Palmeiras, 100 - São Paulo, SP',
    responsavel: 'João Silva',
    telefone: '+55 11 99999-1111'
  },
  {
    id: 'c2',
    nome: 'Barbearia Central',
    cnpjCpf: '98.765.432/0001-55',
    endereco: 'Av. Paulista, 2000 - São Paulo, SP',
    responsavel: 'Carlos Souza',
    telefone: '+55 11 99999-2222'
  },
  {
    id: 'c3',
    nome: 'Barbearia da Praça',
    cnpjCpf: '33.444.555/0001-22',
    endereco: 'Praça Central, 15 - Campinas, SP',
    responsavel: 'Marcos Lima',
    telefone: '+55 11 99999-3333'
  },
  {
    id: 'c4',
    nome: 'Barbearia Premium',
    cnpjCpf: '77.888.999/0001-01',
    endereco: 'Alameda Santos, 800 - São Paulo, SP',
    responsavel: 'Fernanda Rocha',
    telefone: '+55 11 99999-4444'
  }
];
