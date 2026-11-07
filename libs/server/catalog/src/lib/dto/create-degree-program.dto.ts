import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDegreeProgramDto {
  // L'identificativo è una chiave interna: se non viene indicato il server
  // lo genera a partire dal nome, così la segreteria non deve inventarlo.
  @ApiPropertyOptional({
    example: 'ingegneria-informatica',
    description:
      'Technical identifier of the degree program. Generated from the name when omitted.',
  })
  @IsOptional()
  @IsString({ message: "L'identificativo deve essere un testo" })
  @MinLength(2, { message: "L'identificativo deve contenere almeno 2 caratteri" })
  id?: string;

  @ApiProperty({
    example: 'L-31',
    description: 'Official degree code',
  })
  @IsString({ message: 'Il codice deve essere un testo' })
  @MinLength(2, { message: 'Il codice del corso deve contenere almeno 2 caratteri (es. L-8)' })
  code!: string;

  @ApiProperty({
    example: 'Ingegneria Informatica',
    description: 'Display name of the degree program',
  })
  @IsString({ message: 'Il nome deve essere un testo' })
  @MinLength(3, { message: 'Il nome del corso deve contenere almeno 3 caratteri' })
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
