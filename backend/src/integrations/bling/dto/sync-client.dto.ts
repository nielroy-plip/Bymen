import { IsOptional, IsString } from 'class-validator';

export class SyncClientDto {
  @IsString()
  localClientId: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  document?: string;
}
