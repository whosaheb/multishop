import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'mobileNumber must be a 10-digit number',
  })
  mobileNumber!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
