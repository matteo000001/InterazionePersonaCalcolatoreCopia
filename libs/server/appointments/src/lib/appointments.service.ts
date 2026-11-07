import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamAppointment,
  User
} from '@exam-planner/shared-types';
import {
  UserRole,
} from "@exam-planner/shared-types";
import { isHoliday, isWeekend, today } from '@exam-planner/shared-utils';
import { CatalogService } from '@exam-planner/server-catalog';
import { SessionsService } from '@exam-planner/server-sessions';
import { SubjectService } from '@exam-planner/server-subject';
import { ExamAppointmentEntity } from './appointmentExam.entity';
import { AppointmentsRepository } from './appointments.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';



@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly catalogService: CatalogService,
    private readonly sessionsService: SessionsService,
    private readonly subjectService: SubjectService
  ) {}

  async list(query: ListAppointmentsQueryDto): Promise<ExamAppointmentEntity[]> {
    return this.appointmentsRepository.findAll(query);
  }

  async create(dto: CreateAppointmentDto, user: User) {
    const subject = await this.subjectService.getById(dto.subjectId);
    const appointmentData = {
      ...dto,
      courseYearId: subject.courseYearId,
    };

    await this.ensureMutationAllowed(dto.examDate);//verifica data
    await this.catalogService.ensureDegreeProgramExists(
      appointmentData.degreeProgramId
    );
    await this.catalogService.ensureCourseYearExists(appointmentData.courseYearId);
    this.ensureTeacherCanManageDegreeProgram(
      user,
      appointmentData.degreeProgramId
    );
    await this.ensureSubjectMatchesAppointment(
      appointmentData.subjectId,
      user.id,
      appointmentData.degreeProgramId,
      appointmentData.courseYearId
    );

    const existing = (
      await this.appointmentsRepository.findAll({
        degreeProgramId: appointmentData.degreeProgramId,
        courseYearId: appointmentData.courseYearId,
      })
    ).find((appointment) => appointment.examDate === appointmentData.examDate);

    if (existing) {
      throw new BadRequestException(
        'Another appointment already exists for this degree program, course year and day'
      );
    }

    return this.appointmentsRepository.createOne(appointmentData, user.id);
  }

  async update(id: string, dto: UpdateAppointmentDto, user: User) {
    const appointment = await this.getById(id);
    this.ensureOwnership(appointment, user);
    const subject = await this.subjectService.getById(
      dto.subjectId ?? appointment.subjectId
    );

    const updatedAppointment = {
      ...appointment,
      ...dto,
      courseYearId: subject.courseYearId,
      // Una nota vuota cancella quella precedente; se il campo non viene
      // inviato la nota resta invariata.
      notes: dto.notes !== undefined ? dto.notes.trim() : appointment.notes,
    };

    await this.ensureMutationAllowed(updatedAppointment.examDate);
    await this.catalogService.ensureDegreeProgramExists(
      updatedAppointment.degreeProgramId
    );
    await this.catalogService.ensureCourseYearExists(
      updatedAppointment.courseYearId
    );
    this.ensureTeacherCanManageDegreeProgram(
      user,
      updatedAppointment.degreeProgramId
    );
    await this.ensureSubjectMatchesAppointment(
      updatedAppointment.subjectId,
      updatedAppointment.teacherId,
      updatedAppointment.degreeProgramId,
      updatedAppointment.courseYearId
    );
    const existing = (
      await this.appointmentsRepository.findAll({
        degreeProgramId: updatedAppointment.degreeProgramId,
        courseYearId: updatedAppointment.courseYearId,
      })
    ).find(
      (currentAppointment) =>
        currentAppointment.examDate === updatedAppointment.examDate &&
        currentAppointment.id !== id
    );

    if (existing) {
      throw new BadRequestException(
        'Another appointment already exists for this degree program, course year and day'
      );
    }

    const updated = await this.appointmentsRepository.updateOne(
      id,
      updatedAppointment
    );
    if (!updated) {
      throw new NotFoundException('Not found to delete');
    }
    return updated;
  }

  async delete(id: string, user: User) {
    const appointment = await this.getById(id);
    this.ensureOwnership(appointment, user);
    await this.ensureMutationAllowed(appointment.examDate);
    const deleted = await this.appointmentsRepository.deleteOne(id);
    if (!deleted) {
      throw new NotFoundException('Not found ');
    }
    return { deleted: true };
  }

  async getById(id: string): Promise<ExamAppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);

    if (!appointment) {
      throw new NotFoundException(`Appointment "${id}" not found`);
    }

    return appointment;
  }

  private async ensureMutationAllowed(examDate: string) {
    const session = await this.sessionsService.getCurrent();

    if (!(await this.sessionsService.isPlanningOpen(today))) {
      throw new BadRequestException(
        'Appointments can only be changed during the planning window'
      );
    }

    if (!(await this.sessionsService.isDateInsideSession(examDate))) {
      throw new BadRequestException('The exam date must be inside the active session');
    }

    if (isWeekend(examDate)) {
      throw new BadRequestException('Weekend dates are not allowed');
    }

    if (isHoliday(examDate, session.excludedHolidayDates)) {
      throw new BadRequestException('The selected date is a configured holiday');
    }
  }



  private ensureOwnership(appointment: ExamAppointment, user: User) {
    if (user.role === UserRole.SECRETARY) {
      return;
    }

    if (appointment.teacherId !== user.id) {
      throw new ForbiddenException(
        'Teachers can only modify or delete their own appointments'
      );
    }
  }

  private ensureTeacherCanManageDegreeProgram(user: User, degreeProgramId: string) {
    if (user.role !== UserRole.TEACHER) {
      return;
    }

    if (!user.managedDegreeProgramIds?.includes(degreeProgramId)) {
      throw new ForbiddenException(
        'Teachers can create or modify appointments only for their own degree programs'
      );
    }
  }

  private async ensureSubjectMatchesAppointment(
    subjectId: number,
    teacherId: number,
    degreeProgramId: string,
    courseYearId: string
  ) {
    const subject = await this.subjectService.getById(subjectId);

    if (subject.teacherId !== teacherId) {
      throw new BadRequestException(
        `Subject "${subjectId}" is not assigned to teacher "${teacherId}"`
      );
    }

    if (!subject.degreeProgramIds.includes(degreeProgramId)) {
      throw new BadRequestException(
        `Subject "${subjectId}" is not provided in degree program "${degreeProgramId}"`
      );
    }

    if (subject.courseYearId !== courseYearId) {
      throw new BadRequestException(
        `Subject "${subjectId}" is not taught in course year "${courseYearId}"`
      );
    }
  }
}
