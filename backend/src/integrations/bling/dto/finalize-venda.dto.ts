import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FinalizeVendaItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class FinalizeVendaDto {
  @IsString()
  vendaId: string;

  @IsString()
  localClientId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalizeVendaItemDto)
  items: FinalizeVendaItemDto[];
}
