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
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    example: 'marcorossi@icloud.com',
    description: 'Unique email address for the user',
  })
  @IsEmail()
  @IsNotEmpty()
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
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    type: [String],
    example: ['cs'],
    description:
      'Degree programs that the teacher can manage. Optional for secretary.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managedDegreeProgramIds?: string[];
}
