import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { BlingService } from './bling.service';
import { FinalizeMedicaoDto, FinalizeVendaDto, StockCheckDto, StockMovementDto, SyncClientDto } from './dto';

@Controller('integrations/bling')
export class BlingController {
  constructor(private readonly blingService: BlingService) {}

  @Get('health')
  health() {
    return this.blingService.healthCheck();
  }

  @Get('oauth/authorize-url')
  getAuthorizeUrl(@Query('state') state?: string) {
    return this.blingService.getAuthorizeUrl(state);
  }

  @Post('oauth/token')
  exchangeToken(@Body() body: { code: string }) {
    return this.blingService.exchangeAuthorizationCode(body.code);
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('autoToken') autoToken?: string,
  ) {
    if (!code) {
      return {
        ok: false,
        message: 'Código de autorização não recebido no callback.',
        state,
      };
    }

    const shouldExchange = String(autoToken || '').toLowerCase() === 'true';
    if (!shouldExchange) {
      return {
        ok: true,
        message: 'Code recebido com sucesso. Envie este code para /oauth/token para trocar pelos tokens.',
        code,
        state,
      };
    }

    const tokenResponse = await this.blingService.exchangeAuthorizationCode(code);
    return {
      ok: true,
      message: 'Code recebido e trocado por tokens com sucesso.',
      state,
      tokenResponse,
    };
  }

  @Post('clients/sync')
  syncClient(@Body() dto: SyncClientDto) {
    return this.blingService.syncClient(dto);
  }

  @Post('stock/check')
  stockCheck(@Body() dto: StockCheckDto) {
    return this.blingService.stockCheck(dto);
  }

  @Post('stock/movement')
  stockMovement(@Body() dto: StockMovementDto) {
    return this.blingService.stockMovement(dto);
  }

  @Post('medicoes/:medicaoId/finalize')
  finalize(@Param('medicaoId') medicaoId: string, @Body() dto: Omit<FinalizeMedicaoDto, 'medicaoId'>) {
    return this.blingService.finalizeMedicao({ ...dto, medicaoId });
  }

  @Post('vendas/:vendaId/finalize')
  finalizeVenda(@Param('vendaId') vendaId: string, @Body() dto: Omit<FinalizeVendaDto, 'vendaId'>) {
    return this.blingService.finalizeVenda({ ...dto, vendaId });
  }

  @Post('webhooks')
  receiveWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-webhook-token') webhookToken?: string,
    @Headers('x-bling-topic') blingTopic?: string,
  ) {
    return this.blingService.receiveWebhook({
      payload,
      topicHint: blingTopic,
      authorization,
      webhookToken,
      endpoint: '/integrations/bling/webhooks',
    });
  }

  @Post('webhooks/:topic')
  receiveWebhookByTopic(
    @Param('topic') topic: string,
    @Body() payload: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-webhook-token') webhookToken?: string,
  ) {
    return this.blingService.receiveWebhook({
      payload,
      topicHint: topic,
      authorization,
      webhookToken,
      endpoint: `/integrations/bling/webhooks/${topic}`,
    });
  }
}
