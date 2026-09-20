import { IsNotEmpty, IsString } from 'class-validator';

export class AssignEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  shopId!: string;
}
