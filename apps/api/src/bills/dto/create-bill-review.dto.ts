import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { BillReviewDecision } from '@prisma/client';

export class CreateBillReviewDto {
  @IsEnum(BillReviewDecision)
  decision!: BillReviewDecision;

  @ValidateIf((o) => o.decision === BillReviewDecision.DISPUTED)
  @IsString()
  @IsNotEmpty({ message: 'Reason is required when disputing a bill' })
  reason?: string;
}
