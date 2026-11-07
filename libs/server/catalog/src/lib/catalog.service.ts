import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { CreateCourseYearDto } from './dto/create-course-year.dto';
import { CreateDegreeProgramDto } from './dto/create-degree-program.dto';
import { UpdateDegreeProgramDto } from './dto/update-degree-program.dto';

// Ricava un identificativo leggibile dal nome: «Ingegneria Elettronica» →
// «ingegneria-elettronica».
function toDegreeProgramId(name: string) {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug.length >= 2 ? slug : 'corso';
}

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getDegreePrograms() {
    const degreePrograms = await this.catalogRepository.getDegreePrograms();
    if (degreePrograms.length === 0) {
      throw new NotFoundException('no degree programs found');
    }
    return degreePrograms;
  }

  async getCourseYears() {
    const courseYears = await this.catalogRepository.getCourseYears();
    if (courseYears.length === 0) {
      throw new NotFoundException('no course years found');
    }
    return courseYears;
  }

  async ensureDegreeProgramExists(degreeProgramId: string) {
    const degreePrograms = await this.getDegreePrograms();
    const found = degreePrograms.some(
      (program) => program.id === degreeProgramId
    );

    if (!found) {
      throw new NotFoundException(
        `Degree program "${degreeProgramId}" does not exist`
      );
    }
  }

  async ensureCourseYearExists(courseYearId: string) {
    const courseYears = await this.getCourseYears();
    const found = courseYears.some((year) => year.id === courseYearId);

    if (!found) {
      throw new NotFoundException(`Course year "${courseYearId}" does not exist`);
    }
  }

  async createDegreeProgram(dto: CreateDegreeProgramDto) {
    const requestedId = dto.id?.trim();

    if (requestedId) {
      const existing = await this.catalogRepository.findDegreeProgramById(requestedId);

      if (existing) {
        throw new ConflictException(
          'Esiste già un corso di laurea con questo identificativo'
        );
      }

      return this.catalogRepository.createDegreeProgram({ ...dto, id: requestedId });
    }

    return this.catalogRepository.createDegreeProgram({
      ...dto,
      id: await this.generateDegreeProgramId(dto.name),
    });
  }

  private async generateDegreeProgramId(name: string) {
    const baseId = toDegreeProgramId(name);
    let candidate = baseId;
    let suffix = 2;

    while (await this.catalogRepository.findDegreeProgramById(candidate)) {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  async updateDegreeProgram(id: string, dto: UpdateDegreeProgramDto) {
    const updated = await this.catalogRepository.updateDegreeProgram(id, dto);

    if (!updated) {
      throw new NotFoundException('Corso di laurea non trovato');
    }

    return updated;
  }

  async deleteDegreeProgram(id: string) {
    const deleted = await this.catalogRepository.deleteDegreeProgram(id);

    if (!deleted) {
      throw new NotFoundException(`Degree program "${id}" not found`);
    }

    return { deleted: true };
  }

  async createCourseYear(dto: CreateCourseYearDto) {
    const existing = await this.catalogRepository.findCourseYearById(dto.id);

    if (existing) {
      throw new ConflictException('course year id already in use');
    }

    return this.catalogRepository.createCourseYear(dto);
  }
}
