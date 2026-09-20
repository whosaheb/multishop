import { IsDateString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class SetPriceDto {
  @IsNumber()
  @IsPositive()
  pricePerUnit!: number;

  @IsDateString()
  @IsNotEmpty()
  effectiveDate!: string;
}
