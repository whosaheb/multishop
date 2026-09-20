import { IsEnum, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'mobileNumber must be a 10-digit number' })
  mobileNumber!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
