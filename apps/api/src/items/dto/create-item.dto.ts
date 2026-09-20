import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  baseUnitId!: string;

  @IsString()
  @IsNotEmpty()
  sellingUnitId!: string;

  @IsNumber()
  @IsPositive()
  initialPrice!: number;
}
