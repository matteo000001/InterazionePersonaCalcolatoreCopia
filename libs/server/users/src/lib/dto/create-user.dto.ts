import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@exam-planner/shared-types';

export class CreateUserDto {
  @ApiProperty({
    example: 'Marco Rossi',
    description: 'Full name shown in the application',
  })
  @IsString({ message: 'Il nome deve essere un testo.' })
  @MinLength(3, { message: 'Il nome deve contenere almeno 3 caratteri.' })
  name!: string;

  @ApiProperty({
    example: 'marcorossi@icloud.com',
    description: 'Unique email address for the user',
  })
  @IsEmail({}, { message: "Inserisci un'e-mail valida, ad esempio nome.cognome@ateneo.it." })
  @IsNotEmpty({ message: "Inserisci l'e-mail." })
  email!: string;

  @IsNotEmpty({ message: 'Inserisci una password.' })
  @MinLength(8, { message: 'La password deve contenere almeno 8 caratteri.' })
  @IsString({ message: 'La password deve essere una stringa di testo.' })
  @Matches(/[A-Z]/, {
    message: 'La password deve contenere almeno una lettera maiuscola da A a Z.',
  })
  @Matches(/[?^!@#]/, {
    message: 'La password deve contenere almeno un carattere speciale tra ?^!@#.',
  })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.TEACHER,
    description: 'Choose whether the new user is a teacher or a secretary',
  })
  @IsEnum(UserRole, { message: 'Scegli un ruolo tra Docente e Segreteria.' })
  role!: UserRole;

  @ApiPropertyOptional({
    type: [String],
    example: ['cs'],
    description:
      'Degree programs that the teacher can manage. Optional for secretary.',
  })
  @IsOptional()
  @IsArray({ message: 'I corsi gestiti devono essere un elenco di corsi di laurea.' })
  @IsString({ each: true, message: 'Ogni corso gestito deve essere un corso di laurea valido.' })
  managedDegreeProgramIds?: string[];
}
