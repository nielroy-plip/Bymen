import { IsEmail, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsEmail()
  actorEmail: string;

  @IsEmail()
  targetEmail: string;

  @IsString()
  role: string;
}
