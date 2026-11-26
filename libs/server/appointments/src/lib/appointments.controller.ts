import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@exam-planner/server-auth';
import { CurrentUser, JwtAuthGuard } from '@exam-planner/server-security';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() 
  @Get()
  @ApiOkResponse({ description: 'Returns appointments for the selected filters.' })
  @ApiQuery({
    name: 'degreeProgramId',
    required: false,
    description: 'Optional degree program filter.',
  })
  @ApiQuery({
    name: 'courseYearId',
    required: false,
    description: 'Optional course year filter.',
  })
  list(@Query() query: ListAppointmentsQueryDto) {
    return this.appointmentsService.list(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('mine')
  @ApiOkResponse({ description: 'Returns the signed-in user’s appointments across all degree programs and course years.' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.listForTeacher(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subjectId: {
          type: 'number',
          example: 1,
        },
        degreeProgramId: {
          type: 'string',
          example: 'ingeInf',
          description: 'Degree program selected for this appointment',
        },
        courseYearId: {
          type: 'string',
          example: 'year-1',
          description: 'Optional: inferred from subjectId by the backend',
        },
        examDate: {
          type: 'string',
          example: '2026-06-15',
        },
        notes: {
          type: 'string',
          example: 'Analisi 1 - aula A3',
        },
      },
      required: ['subjectId', 'degreeProgramId', 'examDate'],
    },
  })
  @ApiCreatedResponse({ description: 'Creates a new appointment preference.' })
  create(
    @Body(ValidationPipe) dto: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.appointmentsService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() 
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subjectId: {
          type: 'number',
          example: 1,
        },
        degreeProgramId: {
          type: 'string',
          example: 'ingInf',
        },
        courseYearId: {
          type: 'string',
          example: 'year-1',
        },
        examDate: {
          type: 'string',
          example: '2026-06-15',
        },
        notes: {
          type: 'string',
          example: 'Analisi 1 - aula A3',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Updates an appointment preference.' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.appointmentsService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() 
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Deletes an appointment preference.' })
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.delete(id, user);
  }
}
