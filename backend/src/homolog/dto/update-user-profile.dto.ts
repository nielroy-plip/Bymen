import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
