import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BlingService } from './bling.service';
import { FinalizeMedicaoDto, StockCheckDto, StockMovementDto, SyncClientDto } from './dto';

@Controller('integrations/bling')
export class BlingController {
  constructor(private readonly blingService: BlingService) {}

  @Get('health')
  health() {
    return this.blingService.healthCheck();
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
}
