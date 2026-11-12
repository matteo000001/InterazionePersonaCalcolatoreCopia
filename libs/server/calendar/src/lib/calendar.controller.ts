import { Controller, Get, Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '@exam-planner/server-security';

class CalendarAvailabilityQueryDto {
  @IsString()
  degreeProgramId!: string;

  @IsString()
  courseYearId!: string;
}

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard)
  @Get('availability')
  @ApiOkResponse({ description: 'Returns the calendar availability for filters.' })
  getAvailability(@Query() query: CalendarAvailabilityQueryDto) {
    return this.calendarService.getAvailability(
      query.degreeProgramId,
      query.courseYearId
    );
  }
}
