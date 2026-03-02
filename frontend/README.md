
# 💈 Bymen - Sistema de Gestão para Barbearias

Aplicativo mobile moderno para gestão de estoque, vendas, uso interno e relatórios em barbearias, com experiência profissional, responsiva e inovadora.

## 📋 Sobre o Projeto

O **Bymen** é um aplicativo desenvolvido em React Native + Expo que permite o controle completo de estoque, vendas e uso interno de produtos para barbearias. O sistema oferece rastreamento detalhado de produtos, geração de relatórios em PDF e assinatura digital.


## ✨ Funcionalidades e Telas

### 🏠 Dashboard Moderno
- Acesso rápido às principais funções com botões grandes e ícones intuitivos
- Visualização de clientes, estoque, histórico, relatórios e importação

### 🏪 Gestão de Clientes
- Cadastro e edição completos (nome, CNPJ/CPF, endereço, telefone, responsável)
- Visualização de histórico de medições e estoque individualizado

### 📊 Medições e Controle de Estoque
- Tela de medição com abas: **Medição (produtos vendidos)**, **Bancada (uso interno)**
- Navegação por abas com ícones e feedback visual
- Cálculo automático de estoque, vendas, reposições e bonificações
- Aba de bonificação para produtos gratuitos

### 📄 Relatórios e Gráficos
- Tela de relatórios com gráficos de vendas e estoque (LineChart/BarChart)
- Filtros por período e tipo de produto
- Modal de detalhamento ao tocar nos gráficos
- Exportação e compartilhamento de relatórios (PDF, WhatsApp)

### 📥 Importação de Estoque
- Importação via CSV simples e validado
- Feedback visual e validação automática

### ✍️ Assinatura Digital
- Modal em tela cheia, preview, limpar/cancelar/confirmar
- Assinatura integrada ao PDF gerado

### 📱 Design, UX e Inovações
- Interface responsiva para mobile e tablet
- Ícones em botões e abas para navegação intuitiva
- Cards com sombra, cores temáticas e tipografia moderna
- Feedback visual em todas as ações (modais, filtros, seleção)
- Modal de detalhamento em gráficos
- Navegação fluida e transições suaves

## 🛠️ Tecnologias Utilizadas

- **React Native** - Framework mobile multiplataforma
- **Expo SDK ~54.0** - Plataforma de desenvolvimento
- **TypeScript** - Tipagem estática
- **React Navigation** - Navegação entre telas
- **AsyncStorage** - Persistência local com fallback offline
- **Backend NestJS + Supabase (PostgreSQL)** - Persistência homologada
- **expo-print** - Geração de PDFs
- **react-native-signature-canvas** - Captura de assinatura digital
- **expo-sharing** - Compartilhamento de arquivos

## 📁 Estrutura do Projeto

```
barbearia/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── ProductRow.tsx   # Linha de produto para medição
│   │   ├── BancadaRow.tsx   # Linha de produto para bancada
│   │   └── SignaturePad.tsx # Modal de assinatura
│   ├── data/                # Dados estáticos
│   │   ├── clients.tsx      # Clientes pré-cadastrados
│   │   └── products.tsx     # Catálogo de produtos Bymen
│   ├── hooks/               # Custom hooks
│   │   └── useResponsive.tsx
│   ├── screens/             # Telas do aplicativo
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ClientesScreen.tsx
│   │   ├── ClienteDetalhesScreen.tsx
│   │   ├── CriarMedicaoScreen.tsx      # Tela com abas
│   │   ├── FinalizarMedicaoScreen.tsx
│   │   ├── HistoricoMedicoesScreen.tsx
│   │   └── ImportarEstoqueScreen.tsx
│   ├── services/            # Lógica de negócio
│   │   ├── api.tsx          # Persistência e tipos
│   │   ├── pdf.tsx          # Geração de PDF
│   │   └── whatsapp.tsx     # Compartilhamento
│   ├── types/               # Declarações TypeScript
│   │   └── signature.d.ts
│   ├── utils/               # Funções auxiliares
│   │   ├── calculate.tsx
│   │   └── format.tsx
│   └── routes.tsx           # Configuração de rotas
├── App.tsx                  # Componente raiz
├── package.json
└── tsconfig.json
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Expo CLI
- Expo Go (app mobile) ou emulador Android/iOS

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Entre na pasta do projeto
cd barbearia

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npx expo start
```

### Ambiente de homologação (frontend)

1. Crie um arquivo `.env` na raiz do frontend com:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

2. Suba o backend em homologação (`backend/.env` com `DATABASE_URL` do Supabase).

### Executando no dispositivo
1. Abra o app **Expo Go** no seu celular
2. Escaneie o QR Code que aparece no terminal
3. O app será carregado automaticamente


## 📱 Fluxo de Uso

1. **Login**
2. **Dashboard**: Botões com ícones para cada função
3. **Clientes**: Lista, cadastro e edição
4. **Medição**: Abas Medição/Bancada/Bonificação
5. **Finalizar Medição**: Revisão, assinatura, PDF
6. **Relatórios**: Gráficos interativos, filtros, exportação
7. **Importação**: Estoque via CSV
8. **Compartilhamento**: PDF via WhatsApp

## 💾 Armazenamento de Dados

O sistema utiliza **AsyncStorage** local e sincronização com backend em homologação:
- `bymen_measurements` - Histórico de medições
- `bymen_stock` - Estoque do distribuidor
- `bymen_client_stock` - Estoque por cliente
- `bymen_clients` - Lista de clientes cadastrados
- Supabase (via backend): usuários, barbearias, medições e movimentos de estoque

## 📊 Tipos de Dados

### MedicaoRow (Produtos Vendidos)
```typescript
{
  id: string;
  nome: string;
  estoqueAtual: number;
  vendidos: number;
  repostos: number;
  diferenca: number;      // EA - Novo Estoque
  novoEstoque: number;    // EA - V + R
  valorMedicao: number;   // V × Preço
}
```

### BancadaRow (Uso Interno)
```typescript
{
  id: string;
  nome: string;
  quantidadeComprada: number;
  valorTotal: number;     // Qtd × Preço
}
```

## 📋 Formato CSV para Importação

```csv
Shampoo Fortificante,45
Balm Pós-Barba,32
Pomada Modeladora,28
Óleo Capilar,15
Tônico Capilar,10
```

**Regras:**
- Formato: `NomeDoProduto,Quantidade`
- Nome do produto deve ser **exatamente igual** ao cadastrado
- Separador: vírgula (`,`)
- Uma linha por produto


## 🎨 Design, UX e Responsividade

- Layout responsivo para mobile e tablet (breakpoint: 400px/768px)
- Cores temáticas (azul para medição, vermelho para bancada)
- Cards com sombra, títulos centralizados, espaçamento otimizado
- Ícones em botões, abas e títulos de gráficos
- Feedback visual em filtros, seleção e ações
- Modal de detalhamento em gráficos
- Navegação fluida e moderna

## 🔐 Segurança

- Validação de payload no backend (`ValidationPipe`)
- Persistência homologada em Supabase via API NestJS
- Assinatura digital para validação de documentos

## 📝 Licença

Este projeto é proprietário da Bymen.

## 👥 Suporte

Para dúvidas ou suporte técnico, entre em contato com a equipe Bymen.

---

**Versão**: 1.0.0  
**Última atualização**: Fevereiro 2026
