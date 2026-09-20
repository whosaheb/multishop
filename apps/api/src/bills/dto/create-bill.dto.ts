import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class BillItemInputDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class BillAttachmentInputDto {
  @IsString()
  @IsNotEmpty()
  objectKey!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;

  @IsString()
  @IsNotEmpty()
  hash!: string;
}

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsInt()
  @Min(1)
  billNumber!: number;

  @IsString()
  @IsOptional()
  billDate?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsNumber()
  @Min(0)
  actualAmount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemInputDto)
  items!: BillItemInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BillAttachmentInputDto)
  attachment?: BillAttachmentInputDto;
}
