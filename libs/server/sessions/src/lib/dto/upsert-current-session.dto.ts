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

// Messaggi in italiano, comprensibili dalla segreteria: non citano i nomi
// interni dei campi né lo standard ISO 8601.
export class UpsertCurrentSessionDto {
  @ApiProperty()
  @IsDateString({}, { message: "Indica una data valida per l'inizio della sessione d'esami" })
  sessionStart!: string;

  @ApiProperty()
  @IsDateString({}, { message: "Indica una data valida per la fine della sessione d'esami" })
  @Validate(SessionEndAfterStartValidator)
  sessionEnd!: string;

  @ApiProperty()
  @IsDateString({}, { message: "Indica una data valida per l'inizio della finestra di pianificazione" })
  planningStart!: string;

  @ApiProperty()
  @IsDateString({}, { message: 'Indica una data valida per la fine della finestra di pianificazione' })
  @Validate(PlanningEndAfterStartValidator)
  @Validate(PlanningBeforeSessionValidator)
  planningEnd!: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['2026-04-25', '2026-05-01'],
  })
  @IsOptional()
  @IsArray({ message: 'Le festività escluse devono essere un elenco di date' })
  @ArrayUnique({ message: 'Ogni festività esclusa può comparire una sola volta' })
  @IsDateString(
    {},
    {
      each: true,
      message: 'Ogni festività esclusa deve essere una data valida (ad esempio 25/12/2026)',
    }
  )
  excludedHolidayDates?: string[];
}
