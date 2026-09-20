import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  fromShopId!: string;

  @IsString()
  @IsNotEmpty()
  toShopId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number; // base unit

  @IsString()
  @IsOptional()
  reason?: string;
}
