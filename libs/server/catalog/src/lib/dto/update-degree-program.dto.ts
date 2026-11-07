import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDegreeProgramDto } from './create-degree-program.dto';

// L'identificativo non si modifica: è il riferimento usato da materie, utenti e appelli.
export class UpdateDegreeProgramDto extends PartialType(
  OmitType(CreateDegreeProgramDto, ['id'] as const)
) {}
