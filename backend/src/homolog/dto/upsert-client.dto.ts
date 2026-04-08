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

  @IsString()
  @MinLength(11)
  cnpjCpf: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  cep?: string;

  @IsString()
  @MinLength(5)
  endereco: string;

  @IsString()
  @MinLength(3)
  responsavel: string;
}
