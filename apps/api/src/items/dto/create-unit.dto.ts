import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { UnitType } from '@prisma/client';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(UnitType)
  type!: UnitType;

  @IsNumber()
  @IsPositive()
  toCanonicalFactor!: number;
}
