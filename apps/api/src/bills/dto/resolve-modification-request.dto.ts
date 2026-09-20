import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModificationRequestStatus } from '@prisma/client';
import { BillItemInputDto } from './create-bill.dto';

export class ResolveModificationRequestDto {
  @IsEnum(ModificationRequestStatus)
  status!: ModificationRequestStatus; // RESOLVED or DECLINED

  @IsString()
  @IsNotEmpty()
  resolutionReason!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisedActualAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemInputDto)
  revisedItems?: BillItemInputDto[];
}
