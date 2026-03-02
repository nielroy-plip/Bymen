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

## Observações de consistência

- toda chamada é logada em `IntegrationLog`;
- falhas após retries vão para `IntegrationDeadLetter`;
- endpoints exatos do Bling podem variar conforme versão/plano e podem ser ajustados no `BlingService` sem alterar os controllers.
