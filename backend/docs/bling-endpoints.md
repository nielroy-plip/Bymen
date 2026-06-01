# Bling – Endpoints usados no backend

Base URL selecionada por ambiente:

- `BLING_ENV=homolog` usa `BLING_BASE_URL_HOMOLOG`
- `BLING_ENV=production` usa `BLING_BASE_URL_PRODUCTION`

## 1) Health

`GET /api/integrations/bling/health`

Retorna ambiente ativo e se a API key está configurada.

## 2) Sincronizar cliente

`POST /api/integrations/bling/clients/sync`

Body:

```json
{
  "localClientId": "uuid-local",
  "name": "Barbearia XPTO",
  "phone": "+5511999999999",
  "document": "12345678901"
}
```

Comportamento:

- se cliente local já tiver `blingExternalId`, retorna vínculo existente;
- se não tiver, cria cliente no Bling e persiste vínculo no banco local.

## 3) Consulta de estoque

`POST /api/integrations/bling/stock/check`

Body (um dos dois campos):

```json
{
  "localProductId": "uuid-local"
}
```

ou

```json
{
  "externalProductId": "123456"
}
```

## 4) Movimentação de estoque

`POST /api/integrations/bling/stock/movement`

Body:

```json
{
  "localProductId": "uuid-local",
  "quantity": 5,
  "type": "REPOSICAO"
}
```

`type` aceito: `VENDA | REPOSICAO | ENTRADA | RETIRADA | AJUSTE`.

## 5) Finalização de medição (pedido + NF)

`POST /api/integrations/bling/medicoes/:medicaoId/finalize`

Body:

```json
{
  "localClientId": "uuid-client",
  "items": [
    { "productId": "uuid-product", "quantity": 2, "unitPrice": 59.9 }
  ]
}
```

Comportamento:

- cria pedido de venda no Bling;
- tenta emissão de NF;
- grava na `Medicao` local: `blingOrderNumber`, `invoiceAccessKey`, `invoicePdfUrl`, `finalizedAt`.

## 6) Recebimento de webhooks do Bling

Endpoint principal:

`POST /api/integrations/bling/webhooks`

Endpoint alternativo por tópico:

`POST /api/integrations/bling/webhooks/:topic`

Comportamento atual:

- identifica webhook de `Produtos` e sincroniza cadastro local (nome, linha, capacidade, preços);
- identifica webhook de `Estoques` e ajusta saldo local com movimentação automática em `InventoryMovement` (`ENTRADA` ou `RETIRADA`) na localização `bling-main`;
- registra cada recebimento em `IntegrationLog`.

Segurança opcional:

- configure `BLING_WEBHOOK_TOKEN` no backend;
- envie o mesmo token no Bling para o header `x-webhook-token` (ou `Authorization: Bearer <token>`).

URL para cadastro no Bling (exemplo com ambiente atual do app):

`https://site--bymen--8f4tg2jylx4z.code.run/api/integrations/bling/webhooks`

## 7) OAuth (autorização do aplicativo)

Gerar URL de autorização:

`GET /api/integrations/bling/oauth/authorize-url`

Opcional: informar `state` na query.

Callback para receber o `code`:

`GET /api/integrations/bling/oauth/callback`

Troca de `code` por tokens:

`POST /api/integrations/bling/oauth/token`

Body:

```json
{
  "code": "authorization_code_recebido_no_callback"
}
```

Variáveis necessárias no backend:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_OAUTH_REDIRECT_URI`

Importante:

- o `BLING_OAUTH_REDIRECT_URI` precisa ser exatamente o mesmo cadastrado no aplicativo do Bling (Link de redirecionamento);
- para facilitar, use no Bling: `https://site--bymen--8f4tg2jylx4z.code.run/api/integrations/bling/oauth/callback`.

## Observações de consistência

- toda chamada é logada em `IntegrationLog`;
- falhas após retries vão para `IntegrationDeadLetter`;
- endpoints exatos do Bling podem variar conforme versão/plano e podem ser ajustados no `BlingService` sem alterar os controllers.
