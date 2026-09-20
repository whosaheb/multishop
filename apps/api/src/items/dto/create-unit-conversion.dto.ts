import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateUnitConversionDto {
  @IsString()
  @IsNotEmpty()
  fromUnitId!: string;

  @IsString()
  @IsNotEmpty()
  toUnitId!: string;

  @IsNumber()
  @IsPositive()
  factor!: number;
}
