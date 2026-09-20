import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SequenceEventStatus } from '@prisma/client';

export class ResolveSequenceEventDto {
  @IsEnum(SequenceEventStatus)
  status!: SequenceEventStatus;

  @IsBoolean()
  @IsOptional()
  openNewPad?: boolean;

  @IsString()
  @IsOptional()
  newPadLabel?: string;

  @IsString()
  @IsNotEmpty()
  resolutionNotes!: string;
}
