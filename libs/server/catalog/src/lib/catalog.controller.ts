import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@exam-planner/shared-types';
import { CatalogService } from './catalog.service';
import { CreateCourseYearDto } from './dto/create-course-year.dto';
import { CreateDegreeProgramDto } from './dto/create-degree-program.dto';
import { UpdateDegreeProgramDto } from './dto/update-degree-program.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@exam-planner/server-security';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('degree-programs')
  @ApiOkResponse({ description: 'Returns the supported degree programs.' })
  getDegreePrograms() {
    return this.catalogService.getDegreePrograms();
  }

  @ApiBearerAuth()
  @Roles(UserRole.SECRETARY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Post('degree-programs')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'ingegneria-gestionale',
          description: 'Optional: generated from the name when omitted',
        },
        code: {
          type: 'string',
          example: 'L-9',
        },
        name: {
          type: 'string',
          example: 'Ingegneria Gestionale',
        },
        durationYears: {
          type: 'number',
          enum: [2, 3],
          example: 3,
        },
      },
      required: ['code', 'name', 'durationYears'],
    },
  })
  @ApiCreatedResponse({
    description: 'Creates a new degree program.',
  })
  createDegreeProgram(@Body(ValidationPipe) dto: CreateDegreeProgramDto) {
    return this.catalogService.createDegreeProgram(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SECRETARY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Patch('degree-programs/:id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'L-9' },
        name: { type: 'string', example: 'Ingegneria Gestionale' },
        durationYears: { type: 'number', enum: [2, 3], example: 3 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Updates code, name or duration of the selected degree program.',
  })
  updateDegreeProgram(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateDegreeProgramDto
  ) {
    return this.catalogService.updateDegreeProgram(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SECRETARY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Delete('degree-programs/:id')
  @ApiOkResponse({
    description: 'Deletes the selected degree program by id.',
  })
  removeDegreeProgram(@Param('id') id: string) {
    return this.catalogService.deleteDegreeProgram(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('course-years')
  @ApiOkResponse({ description: 'Returns the supported course years.' })
  getCourseYears() {
    return this.catalogService.getCourseYears();
  }

  @ApiBearerAuth()
  @Roles(UserRole.SECRETARY)
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Post('course-years')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'year-3',
        },
        year: {
          type: 'number',
          example: 3,
        },
      },
      required: ['id', 'year'],
    },
  })
  @ApiCreatedResponse({
    description: 'Creates a new course year.',
  })
  createCourseYear(@Body(ValidationPipe) dto: CreateCourseYearDto) {
    return this.catalogService.createCourseYear(dto);
  }
}
