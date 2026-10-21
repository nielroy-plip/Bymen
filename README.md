# Bymen — Sistema de Gestão para Barbearias

Este repositório contém o sistema completo Bymen: frontend mobile (React Native + Expo) e backend (NestJS + Prisma/Supabase). Este README fornece visão geral, instruções de desenvolvimento, execução local, testes e notas sobre a integração com o Bling.

Sumário
- Visão geral
- Estrutura do repositório
- Pré-requisitos
- Execução local (backend / frontend)
- Testes e depuração
- Integração com Bling
- Deploy / Produção (notas)
- Contribuição
- Contato

## Visão geral

Bymen é um aplicativo mobile para gestão de estoque, vendas, uso interno e relatórios para barbearias. Funcionalidades chave:

- Cadastro e histórico de clientes
- Medições e registro de vendas (com assinaturas e PDFs)
- Controle de estoque por cliente e bancadas de uso interno
- Relatórios por vendedor e estoque
- Integração com Bling (Pedidos / Estoque / Webhooks) via backend

## Estrutura do repositório

Raiz:

```
/backend   # API NestJS, integrações, migrations, testes
/frontend  # App Expo (React Native + TypeScript)
README.md  # (este arquivo)
```

- Documentação específica do frontend: [frontend/README.md](frontend/README.md)
- Documentação e endpoints do Bling (backend): [backend/README.md](backend/README.md) e [backend/docs/bling-endpoints.md](backend/docs/bling-endpoints.md)

## Pré-requisitos

- Node.js 18+ e npm ou yarn
- Expo CLI para o frontend
- Postgres (Supabase) para o backend (ou `DATABASE_URL` apontando para instância válida)
- (Opcional) ngrok para expor webhooks localmente

## Execução local

Observação: execute backend e frontend em terminais separados.

### Backend (desenvolvimento)

1. Entre na pasta `backend`:

```bash
cd backend
```

2. Instale dependências e gere Prisma Client:

```bash
npm install
npx prisma generate
```

3. Configure variáveis de ambiente em `backend/.env` (ex.: `DATABASE_URL`, `BLING_*`). Veja `backend/.env.example` como referência.

4. Rodar em modo desenvolvimento:

```bash
npm run start:dev
```

5. Ver logs e integração: o `BlingService` grava cada request em `integrationLog` (via Prisma). Abra Prisma Studio para inspecionar:

```bash
npx prisma studio
```

### Frontend (desenvolvimento)

1. Entre na pasta `frontend`:

```bash
cd frontend
```

2. Instale dependências:

```bash
npm install
```

3. Configure variáveis de ambiente (ex.: `.env` com `EXPO_PUBLIC_API_URL=http://localhost:3000/api`). Para permitir que o app dispare medições ao Bling, defina `EXPO_PUBLIC_ENABLE_BLING=true`.

4. Inicie o Expo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api EXPO_PUBLIC_ENABLE_BLING=true npx expo start
```

5. Abra o app no Expo Go ou emulador e teste fluxos (venda, medição, geração de PDF).

## Testes

### Backend

O backend usa Jest. Para rodar testes:

```bash
cd backend
npm run test
```

Há testes de integração para o Bling em `backend/test/bling.integration.spec.ts`.

### Frontend

O frontend tem utilitários e testes unitários (caso existam scripts). Para rodar lint/test (se configurado), use os scripts em `frontend/package.json`.

## Integração com Bling (resumo)

- As chamadas ao Bling são sempre feitas pelo backend (`BlingService` em `backend/src/integrations/bling/bling.service.ts`).
- Fluxos que disparam integração:
	- Finalizar venda -> POST `/api/integrations/bling/vendas/:vendaId/finalize`
	- Finalizar medição -> POST `/api/integrations/bling/medicoes/:medicaoId/finalize` (o frontend só chama quando `EXPO_PUBLIC_ENABLE_BLING=true`)
- O backend registra cada tentativa em `integrationLog` e falhas graves em `integrationDeadLetter`.

Como confirmar que uma operação foi enviada ao Bling:

1. Gere e finalize uma venda ou medição no app.
2. Abra Prisma Studio e filtre `integrationLog` por `provider = 'BLING'`.
3. Cheque `requestBody`, `responseBody`, `statusCode` e `success`.

Se precisar testar manualmente, use curl substituindo IDs reais (sem `< >`):

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

## Deploy / Produção (notas rápidas)

- Backend: configurar `BLING_ENV=production`, chaves `BLING_API_KEY_PRODUCTION`, e conectar `DATABASE_URL` à instância de produção (Supabase/Postgres). Executar `npm run build` e iniciar `node dist/main.js`.
- Frontend: construir a release via Expo (EAS) ou gerar binários com `eas build`.
- Certifique-se de configurar URLs de webhook no Bling apontando para o endpoint público `/api/integrations/bling/webhooks` e definir `BLING_WEBHOOK_TOKEN`.

## Boas práticas de desenvolvimento

- Logs: use `integrationLog` para auditoria das integrações Bling. Para debugging em tempo real, adicione logs no `callBling` do backend.
- Filas: falhas na comunicação são colocadas em `integrationDeadLetter` e a fila local (`enqueueSyncPending`) garante retry.
- Segurança: não exponha chaves em repositórios. Use secrets manager ou variáveis de ambiente em CI/CD.

## Contribuição

1. Abra uma issue descrevendo a mudança.
2. Crie uma branch com nome descritivo `feature/...` ou `fix/...`.
3. Faça commits pequenos e claros.
4. Crie PRs para a branch `main` com descrição e testes quando aplicável.

## Contato

Para dúvidas, entre em contato com a equipe técnica do projeto.

---

Se quiser, eu posso:

- adicionar uma seção com exemplos de payloads para cada endpoint do Bling;
- gerar uma coleção Postman / arquivo curl com exemplos prontos (IDs fictícios);
- incluir instruções de debug detalhadas (ngrok, capturar tráfego, exemplos de logs).
