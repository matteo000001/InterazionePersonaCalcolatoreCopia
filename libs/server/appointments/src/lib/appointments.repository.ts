import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExamAppointment } from '@exam-planner/shared-types';
import { ExamAppointmentEntity } from './appointmentExam.entity';
import { Repository } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

type PersistableAppointmentDto = CreateAppointmentDto & {
  degreeProgramId: string;
  courseYearId: string;
};
@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectRepository(ExamAppointmentEntity)
    private readonly repository: Repository<ExamAppointmentEntity>
  ) {}

  findAll(filters?: {
    degreeProgramId?: string;
    courseYearId?: string;
  }): Promise<ExamAppointmentEntity[]> {
    if (filters?.degreeProgramId || filters?.courseYearId) {
      return this.repository.find({
        where: {
          ...(filters.degreeProgramId
            ? { degreeProgramId: filters.degreeProgramId }
            : {}),
          ...(filters.courseYearId ? { courseYearId: filters.courseYearId } : {}),
        },
        relations: {
          subject: true,
        },
        order: { examDate: 'ASC', id: 'ASC' },
      });
    }

    return this.repository.find({
      relations: {
        subject: true,
      },
      order: { examDate: 'ASC', id: 'ASC' },
    });
  }

  findById(id: string): Promise<ExamAppointmentEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        subject: true,
      },
    });
  }

  createOne(
    dto: PersistableAppointmentDto,
    teacherId: number
  ): Promise<ExamAppointmentEntity> {
    const newAppointment = this.repository.create({
      teacherId,
      subjectId: dto.subjectId,
      degreeProgramId: dto.degreeProgramId,
      courseYearId: dto.courseYearId,
      examDate: dto.examDate,
      notes: dto.notes?.trim() || undefined,
    });

    return this.repository.save(newAppointment);
  }

  async updateOne(
    id: string,
    dto: Partial<ExamAppointment>
  ): Promise<ExamAppointmentEntity | null> {
    const appointment = await this.findById(id);

    if (!appointment) {
      return null;
    }

    if (dto.teacherId !== undefined) {
      appointment.teacherId = dto.teacherId;
    }

    if (dto.subjectId !== undefined) {
      appointment.subjectId = dto.subjectId;
    }

    if (dto.degreeProgramId !== undefined) {
      appointment.degreeProgramId = dto.degreeProgramId;
    }

    if (dto.courseYearId !== undefined) {
      appointment.courseYearId = dto.courseYearId;
    }

    if (dto.examDate !== undefined) {
      appointment.examDate = dto.examDate;
    }

    if (dto.notes !== undefined) {
      appointment.notes = dto.notes;
    }

    return this.repository.save(appointment);
  }

  async deleteOne(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
