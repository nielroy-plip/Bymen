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

  @IsNumber()
  unitPrice: number;

  @IsString()
  @MinLength(2)
  productName: string;

  @IsString()
  @MinLength(2)
  productLine: string;

  @IsString()
  @MinLength(1)
  productCapacity: string;

  @IsString()
  @MinLength(2)
  productType: string;

  @IsNumber()
  suggestedPrice: number;
}
