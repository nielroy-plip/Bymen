
# 💈 Bymen - Sistema de Gestão para Barbearias (Frontend)

Este arquivo documenta o frontend do aplicativo Bymen, incluindo a estrutura do projeto, telas, componentes, serviços, fluxos críticos (venda/medição/PDF) e a integração com o Bling via backend.

Sumário rápido
- Stack: React Native + Expo (SDK ~54), TypeScript
- Backend: NestJS (API em `http://localhost:3000/api` por padrão)
- Integração com Bling: realizada exclusivamente pelo backend (`/integrations/bling/*`)

Conteúdo deste README
- Arquitetura e estrutura de pastas
- Lista completa de telas (screens) e responsabilidades
- Componentes principais
- Serviços (API, PDF, WhatsApp, seller goals, etc.)
- Fluxos: finalizar venda, finalizar medição, gerar PDF
- Como verificar integração com Bling e debugar
- Como executar e testar localmente

## Estrutura do projeto

```
frontend/
├─ App.tsx
├─ package.json
├─ .env (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_ENABLE_BLING)
├─ src/
│  ├─ components/        # UI reutilizáveis (Button, Card, SignaturePad, ProductRow, BancadaRow...)
│  ├─ data/              # Dados estáticos (clients.tsx, products.tsx)
│  ├─ hooks/             # Hooks customizados (useResponsive, etc.)
│  ├─ screens/           # Telas do app (lista completa abaixo)
│  ├─ services/          # Lógica: api.tsx, pdf.tsx, whatsapp.tsx, sellerGoals.ts, etc.
│  ├─ utils/             # Helpers (format, product helpers, keyboard focus)
│  └─ routes.tsx         # Navegação (RootStack)
```

## Lista de telas (completa)

- `LoginScreen.tsx` — autenticação do usuário
- `DashboardScreen.tsx` — visão geral e atalhos
- `ClientesScreen.tsx` — listagem de clientes
- `ClienteDetalhesScreen.tsx` — histórico e detalhes do cliente
- `CadastrarClienteScreen.tsx` — criar/editar cliente
- `CriarMedicaoScreen.tsx` — interface de medição (abas: Medição, Bancada, Bonificação)
- `FinalizarMedicaoScreen.tsx` — revisão, assinatura, geração de PDF, finalização e sincronização com Bling (condicional)
- `HistoricoMedicoesScreen.tsx` — histórico de medições por cliente
- `VendasScreen.tsx` — nova tela de vendas (montagem do pedido antes de finalizar)
- `FinalizarVendaScreen.tsx` — revisão/assinatura/registro da venda e tentativa de sincronização com Bling
- `EstoqueScreen.tsx` — visualização do estoque por cliente/distribuidor
- `EnviarEstoqueScreen.tsx` — interface para envio/repasse de estoque
- `NovoEstoqueScreen.tsx` — adicionar estoque manualmente
- `ImportarEstoqueScreen.tsx` — CSV import
- `RelatoriosScreen.tsx` — painel de relatórios e gráficos
- `RelatorioVendedorScreen.tsx` — relatório mensal por vendedor (inclui Venda Direta, metas individuais e meta comercial)
- `RelatorioEstoqueRuaScreen.tsx` — relatório de estoque em 'rua' (vendedores)
- `PendenciasSyncScreen.tsx` — lista de sincronizações pendentes (queue)
- `GerenciarUsuariosScreen.tsx` — tela de funcionários / gerenciamento de usuários (criar, editar, roles)
- `ConfiguracoesUsuarioScreen.tsx` — configurações do usuário logado
- `ConfiguracoesGeraisScreen.tsx` — configurações globais do app

## Componentes principais

- `components/Button.tsx`
- `components/Card.tsx`
- `components/Input.tsx`
- `components/SignaturePad.tsx` — captura de assinatura digital
- `components/ProductRow.tsx` — linha de produto para medição/venda
- `components/BancadaRow.tsx` — linha de produto para bancada (uso interno)
- `components/ConsignedProductRow.tsx` — produto consignado
- `components/PriceListRow.tsx`
- `components/PasswordInput.tsx`
- `components/OperationContextHeader.tsx`
- `components/BymenLoader.tsx` / `BymenLoadingOverlay.tsx`
- `components/AppAlertProvider.tsx`

## Serviços (src/services)

- `api.tsx` — camada de persistência local e proxy para backend
  - `homologRequest()` — wrapper para chamadas ao backend (`EXPO_PUBLIC_API_URL`)
  - Funções de leitura/gravação local (AsyncStorage)
  - `saveMeasurement`, `saveSale`, `enqueueSyncPending` (fila de retry)

- `pdf.tsx` — geração de PDFs via `expo-print` e salvamento com nome determinístico

- `whatsapp.tsx` — compartilhamento via WhatsApp/Sharing

- `sellerGoals.ts` — persistência e cálculo de metas comerciais

- `stockCritical.ts`, `notifications.ts`, `settings.ts`, `cep.tsx`, `access.ts` — auxiliares de negócio

## Fluxos críticos

1. Finalizar Venda (frontend):
   - Usuário monta venda em `VendasScreen` → `FinalizarVendaScreen`.
   - `handleConfirmarVenda()` faz validações, atualiza estoque local (`removeProductStock` / street stock) e chama `saveSale()`.
   - `saveSale()` tenta persistir em homolog (`/homolog/sales/upsert`) e faz POST para `/integrations/bling/vendas/:saleId/finalize`.
   - Em caso de falha na sincronização com o backend, a venda é adicionada à fila `enqueueSyncPending`.

2. Finalizar Medição (frontend):
   - Em `FinalizarMedicaoScreen`, após coleta de assinatura e confirmação, `saveMeasurement()` persiste localmente e chama, se `EXPO_PUBLIC_ENABLE_BLING=true`, o endpoint `/integrations/bling/medicoes/:id/finalize`.
   - O backend cria pedido no Bling, tenta emitir NFe e grava `blingOrderNumber` / `invoicePdfUrl` no registro local via resposta.

3. Geração de PDF:
   - `src/services/pdf.tsx` gera HTML, chama `Print.printToFileAsync`, depois copia o arquivo para `FileSystem.documentDirectory` com nome: `<Barbearia>_<Tipo>_<Prefixo>_<DD-MM-YYYY>.pdf`.
   - Assinatura é renderizada em uma nova página para evitar cortes.

## Integração com Bling (detalhes)

- O frontend envia apenas para o backend; o backend faz todas as chamadas ao Bling.
- Endpoints no backend (exemplos):
  - `POST /api/integrations/bling/clients/sync`
  - `POST /api/integrations/bling/stock/movement`
  - `POST /api/integrations/bling/medicoes/:medicaoId/finalize`
  - `POST /api/integrations/bling/vendas/:vendaId/finalize`
  - `POST /api/integrations/bling/webhooks`

- No backend, `BlingService` faz:
  - Autenticação via API key / OAuth (conforme variáveis de ambiente)
  - Rate limiting (requestsPerSecond) e retries com backoff
  - Conversão de XML ↔ JSON quando necessário
  - Logging em `integrationLog` e registro em `integrationDeadLetter`

## Como verificar operacionalmente se o app está enviando ao Bling

1. Habilite `EXPO_PUBLIC_ENABLE_BLING=true` no frontend se quiser que o app dispare medições.
2. Gere uma venda (ou medição) no app e finalize.
3. No backend, abra o Prisma Studio para inspecionar a tabela `integrationLog`:
```bash
cd backend
npx prisma studio
```
Filtre por `provider = 'BLING'` e verifique `endpoint`, `requestBody`, `responseBody`, `statusCode`, `success`.

4. Teste manual com curl (substitua IDs e rode sem os sinais `< >`):
```bash
# Venda
curl -X POST "http://localhost:3000/api/integrations/bling/vendas/SALE_ID/finalize" \
  -H "Content-Type: application/json" \
  -d '{"localClientId":"CLIENT_ID","items":[{"productId":"p1","quantity":1,"unitPrice":10}]}'

# Medição
curl -X POST "http://localhost:3000/api/integrations/bling/medicoes/MEDICAO_ID/finalize" \
  -H "Content-Type: application/json" \
  -d '{"localClientId":"CLIENT_ID","items":[{"productId":"p1","quantity":1,"unitPrice":10}]}'
```

5. Se houver falhas repetidas, confira `integrationDeadLetter` e os logs do backend (stdout). Use ngrok para expor endpoints caso precise que o Bling envie webhooks para um ambiente local.

## Variáveis de ambiente importantes

- Frontend:
  - `EXPO_PUBLIC_API_URL` — URL base da API (ex.: `http://localhost:3000/api`)
  - `EXPO_PUBLIC_ENABLE_BLING` — `true` para permitir sincronização de medições diretamente do app

- Backend (resumo):
  - `BLING_API_KEY_HOMOLOG`, `BLING_API_KEY_PRODUCTION`
  - `BLING_BASE_URL_HOMOLOG`, `BLING_BASE_URL_PRODUCTION`
  - `BLING_ENV` (homolog|production)
  - `BLING_WEBHOOK_TOKEN`
  - `DATABASE_URL`

## Como rodar localmente (resumo)

1. Backend
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

2. Frontend
```bash
cd frontend
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000/api EXPO_PUBLIC_ENABLE_BLING=true npx expo start
```

3. Abrir Prisma Studio para ver logs de integração
```bash
cd backend
npx prisma studio
```

## Checklist de testes de integração (sugestão)

- [ ] Subir backend com variáveis Bling configuradas (homolog)
- [ ] Habilitar `EXPO_PUBLIC_ENABLE_BLING=true` no frontend
- [ ] Criar/atualizar cliente e verificar `clients/sync` no backend
- [ ] Finalizar uma venda; verificar `integrationLog` por `/vendas/:id/finalize`
- [ ] Finalizar uma medição; verificar `integrationLog` por `/medicoes/:id/finalize`
- [ ] Se NFe emitida, verificar campos `invoicePdfUrl`/`invoiceAccessKey` no retorno salvo
- [ ] Simular falha (remover API key) e verificar `integrationDeadLetter`

---

Se desejar, eu adiciono agora:
- exemplos de payloads para cada endpoint do Bling;
- documentação dos formatos de storage local (chaves AsyncStorage);
- um script curl/postman collection com exemplos reais (substituindo IDs).

**Última atualização**: Agosto 2026
{
