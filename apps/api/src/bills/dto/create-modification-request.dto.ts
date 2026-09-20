import { IsNotEmpty, IsString } from 'class-validator';

export class CreateModificationRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
