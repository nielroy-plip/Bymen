import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertClientDto {
  @IsString()
  @MinLength(2)
  id: string;

  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(8)
  telefone: string;

  @IsOptional()
  @IsString()
  cnpjCpf?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;
}
