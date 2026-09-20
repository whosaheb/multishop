import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;
}
