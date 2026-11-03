import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateDegreeProgramDto {
  @ApiProperty({
    example: 'ingInf',
    description: 'Technical identifier of the degree program',
  })
  @IsString()
  @MinLength(2)
  id!: string;

  @ApiProperty({
    example: 'L-31',
    description: 'Official degree code',
  })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({
    example: 'Ingegneria Informatica',
    description: 'Display name of the degree program',
  })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    example: 3,
    enum: [2, 3],
    description: 'Duration in years: 3 = laurea triennale, 2 = laurea magistrale',
  })
  @IsIn([2, 3], {
    message: 'Il tipo di corso deve essere triennale (3 anni) o magistrale (2 anni)',
  })
  durationYears!: number;
}
