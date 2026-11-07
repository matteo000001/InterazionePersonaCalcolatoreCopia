import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DegreeProgramEntity } from './degree-program.entity';
import { CourseYearEntity } from './course-year.entity';
import { CreateDegreeProgramDto } from './dto/create-degree-program.dto';
import { CreateCourseYearDto } from './dto/create-course-year.dto';
@Injectable()
export class CatalogRepository {
  constructor(
    @InjectRepository(DegreeProgramEntity)
    private readonly repository: Repository<DegreeProgramEntity>,
    @InjectRepository(CourseYearEntity)
    private readonly repository1: Repository<CourseYearEntity>
  ) {}

  getDegreePrograms(): Promise<DegreeProgramEntity[]> {
    return this.repository.find({
      order: { id: 'ASC' },
    });
  }

  findDegreeProgramById(id: string): Promise<DegreeProgramEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  createDegreeProgram(
    dto: CreateDegreeProgramDto & { id: string }
  ): Promise<DegreeProgramEntity> {
    const degreeProgram = this.repository.create({
      id: dto.id.trim(),
      code: dto.code.trim(),
      name: dto.name.trim(),
      durationYears: dto.durationYears,
    });

    return this.repository.save(degreeProgram);
  }

  async deleteDegreeProgram(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  getCourseYears(): Promise<CourseYearEntity[]> {
    return this.repository1.find({
      order: { id: 'ASC' },
    });
  }

  findCourseYearById(id: string): Promise<CourseYearEntity | null> {
    return this.repository1.findOne({ where: { id } });
  }

  createCourseYear(dto: CreateCourseYearDto): Promise<CourseYearEntity> {
    const courseYear = this.repository1.create({
      id: dto.id.trim(),
      year: dto.year,
    });

    return this.repository1.save(courseYear);
  }
}
