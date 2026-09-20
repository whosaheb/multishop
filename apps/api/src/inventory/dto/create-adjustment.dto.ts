import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(0)
  physicalStock!: number; // base unit

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
