import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class StockMovementDto {
  @IsString()
  @MinLength(2)
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsIn(['ENTRADA', 'SAIDA'])
  type: 'ENTRADA' | 'SAIDA';

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productLine?: string;

  @IsOptional()
  @IsString()
  productCapacity?: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsNumber()
  suggestedPrice?: number;
}
