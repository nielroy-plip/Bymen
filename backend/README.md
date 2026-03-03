# Backend Modular (NestJS)

Estrutura preparada para homologação com Supabase (PostgreSQL), Prisma e integração com Bling separada por ambiente (`homolog`/`production`).

## Configuração rápida (homologação)

1. Copie `.env.homolog.example` para `.env`.
2. Preencha `DATABASE_URL` com a connection string do Supabase (preferencialmente pooler).
3. Preencha as variáveis `BLING_*` de homologação.
4. Execute:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev
```

API sobe em `http://localhost:3000/api`.

### Observação importante para deploy (Northflank)

- Defina `DATABASE_URL` em **Runtime Variables** (não apenas em Build Variables).
- Use pooler do Supabase (porta `6543`) com SSL:

```text
postgresql://postgres.<project_ref>:<password>@<pooler_host>:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

- Se o log mostrar `db.<project_ref>.supabase.co:5432`, o serviço ainda está usando a URL antiga.
- Use apenas um comando de start no serviço: `npm start` (ou `npm run start:prod`).

## Endpoints Bling disponíveis (base)

- `GET /api/integrations/bling/health`
- `POST /api/integrations/bling/clients/sync`
- `POST /api/integrations/bling/stock/check`
- `POST /api/integrations/bling/stock/movement`
- `POST /api/integrations/bling/medicoes/:medicaoId/finalize`

## Endpoints de homologação (app mobile)

- `POST /api/homolog/users/register`
- `POST /api/homolog/users/login`
- `POST /api/homolog/clients/upsert`
- `GET /api/homolog/clients`
- `POST /api/homolog/measurements/upsert`
- `GET /api/homolog/measurements`
- `POST /api/homolog/stock/movement`
- `GET /api/homolog/stock/balances`

## Segurança e resiliência já aplicadas

- `helmet`, `CORS`, `ValidationPipe` global
- rate limit HTTP básico
- retry com backoff na integração Bling
- log de request/response da integração (`IntegrationLog`)
- dead-letter para falhas irreversíveis (`IntegrationDeadLetter`)

## Ambientes

- Homologação: `.env.homolog.example`
- Produção: `.env.production.example`
- Template geral: `.env.example`

Os campos sensíveis foram deixados em aberto para preenchimento com dados reais.
