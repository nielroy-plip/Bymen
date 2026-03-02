import { IsArray, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TimelineEventDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsString()
  createdAt: string;
}

export class SaveMeasurementDto {
  @IsString()
  @MinLength(2)
  id: string;

  @IsString()
  @MinLength(2)
  clientId: string;

  @IsString()
  dateTime: string;

  @IsArray()
  medicaoRows: any[];

  @IsArray()
  bancadaRows: any[];

  @IsNumber()
  valorMedicao: number;

  @IsNumber()
  valorBancada: number;

  @IsNumber()
  totalGeral: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  syncStatus?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @IsOptional()
  @IsString()
  pdfUri?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineEventDto)
  timeline?: TimelineEventDto[];
}
