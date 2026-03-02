import { IsOptional, IsString } from 'class-validator';

export class StockCheckDto {
  @IsOptional()
  @IsString()
  localProductId?: string;

  @IsOptional()
  @IsString()
  externalProductId?: string;
}
