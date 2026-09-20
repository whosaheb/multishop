import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShopStatus } from '@prisma/client';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;
}
