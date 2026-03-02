import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

const movementTypes = ['VENDA', 'REPOSICAO', 'ENTRADA', 'RETIRADA', 'AJUSTE'] as const;

export class StockMovementDto {
  @IsString()
  localProductId: string;

  @IsOptional()
  @IsString()
  externalProductId?: string;

  @IsNumber()
  quantity: number;

  @IsEnum(movementTypes)
  type: (typeof movementTypes)[number];
}
