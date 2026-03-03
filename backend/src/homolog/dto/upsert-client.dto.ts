import { IsString, MinLength } from 'class-validator';

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

  @IsString()
  @MinLength(5)
  endereco: string;

  @IsString()
  @MinLength(3)
  responsavel: string;
}
