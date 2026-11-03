import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Ogni regola ha il proprio messaggio, cosi l'utente sa quale periodo correggere.
// Le regole si applicano solo quando entrambe le date sono presenti nel corpo.
@ValidatorConstraint({ name: 'sessionEndAfterStart', async: false })
class SessionEndAfterStartValidator implements ValidatorConstraintInterface {
  validate(_value: string, args?: ValidationArguments) {
    const dto = args?.object as UpsertCurrentSessionDto;
    return !dto.sessionStart || !dto.sessionEnd || dto.sessionStart <= dto.sessionEnd;
  }

  defaultMessage() {
    return "La fine della sessione d'esami deve essere uguale o successiva all'inizio";
  }
}

@ValidatorConstraint({ name: 'planningEndAfterStart', async: false })
class PlanningEndAfterStartValidator implements ValidatorConstraintInterface {
  validate(_value: string, args?: ValidationArguments) {
    const dto = args?.object as UpsertCurrentSessionDto;
    return (
      !dto.planningStart || !dto.planningEnd || dto.planningStart <= dto.planningEnd
    );
  }

  defaultMessage() {
    return "La fine della pianificazione deve essere uguale o successiva all'inizio";
  }
}

@ValidatorConstraint({ name: 'planningBeforeSession', async: false })
class PlanningBeforeSessionValidator implements ValidatorConstraintInterface {
  validate(_value: string, args?: ValidationArguments) {
    const dto = args?.object as UpsertCurrentSessionDto;
    return !dto.planningEnd || !dto.sessionStart || dto.planningEnd < dto.sessionStart;
  }

  defaultMessage() {
    return "La finestra di pianificazione deve terminare prima dell'inizio della sessione d'esami";
  }
}

export class UpsertCurrentSessionDto {
  @ApiProperty()
  @IsDateString()
  sessionStart!: string;

  @ApiProperty()
  @IsDateString()
  @Validate(SessionEndAfterStartValidator)
  sessionEnd!: string;

  @ApiProperty()
  @IsDateString()
  planningStart!: string;

  @ApiProperty()
  @IsDateString()
  @Validate(PlanningEndAfterStartValidator)
  @Validate(PlanningBeforeSessionValidator)
  planningEnd!: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['2026-04-25', '2026-05-01'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsDateString({}, { each: true })
  excludedHolidayDates?: string[];
}
