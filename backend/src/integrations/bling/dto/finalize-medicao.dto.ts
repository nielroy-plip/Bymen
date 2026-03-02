import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FinalizeMedicaoItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class FinalizeMedicaoDto {
  @IsString()
  medicaoId: string;

  @IsString()
  localClientId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalizeMedicaoItemDto)
  items: FinalizeMedicaoItemDto[];
}
