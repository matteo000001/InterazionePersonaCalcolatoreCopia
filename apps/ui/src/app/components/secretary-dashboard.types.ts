import {
  CourseYear,
  DegreeProgram,
  ExamSession,
  UserRole,
} from '@exam-planner/shared-types';

export type SessionFormState = Omit<ExamSession, 'id'>;
export type SecretaryMenuItem =
  | 'home'
  | 'users'
  | 'subjects'
  | 'degree-programs'
  | 'appointments';

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managedDegreeProgramIds: string[];
};

export type SubjectFormState = {
  name: string;
  teacherId: number | '';
  degreeProgramIds: string[];
  courseYearId: string;
};

export type DegreeProgramType = 'triennale' | 'magistrale';
export type DegreeProgramYearCount = 2 | 3;

export type DegreeProgramFormState = {
  code: string;
  name: string;
  type: DegreeProgramType;
};

export type AppointmentSearchState = {
  degreeProgramId: string;
  courseYearId: string;
  teacherId: number | '';
  subjectId: number | '';
};

export const defaultSessionForm: SessionFormState = {
  sessionStart: '',
  sessionEnd: '',
  planningStart: '',
  planningEnd: '',
  excludedHolidayDates: [],
};

export const defaultUserForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: UserRole.TEACHER,
  managedDegreeProgramIds: [],
};

export const defaultSubjectForm: SubjectFormState = {
  name: '',
  teacherId: '',
  degreeProgramIds: [],
  courseYearId: '',
};

export const defaultDegreeProgramForm: DegreeProgramFormState = {
  code: '',
  name: '',
  type: 'triennale',
};

export const defaultAppointmentSearch: AppointmentSearchState = {
  degreeProgramId: '',
  courseYearId: '',
  teacherId: '',
  subjectId: '',
};

export function getDegreeProgramDuration(type: DegreeProgramType) {
  return type === 'triennale' ? 3 : 2;
}

// Etichette leggibili per gli elenchi: la segreteria non deve ricordare a
// cosa corrispondono gli identificativi interni (ruoli, corsi, anni).
export function getUserRoleLabel(role: UserRole) {
  return role === UserRole.SECRETARY ? 'Segreteria' : 'Docente';
}

export function getDegreeProgramLabel(program: DegreeProgram) {
  return `${program.name} (${program.code})`;
}

export function getDegreeProgramNames(
  degreeProgramIds: string[],
  degreePrograms: DegreeProgram[]
) {
  return degreeProgramIds
    .map((degreeProgramId) => {
      const program = degreePrograms.find(({ id }) => id === degreeProgramId);
      return program ? getDegreeProgramLabel(program) : 'Corso eliminato';
    })
    .join(', ');
}

export function getCourseYearLabel(courseYearId: string, courseYears: CourseYear[]) {
  const courseYear = courseYears.find(({ id }) => id === courseYearId);
  return courseYear ? `${courseYear.year}° anno` : 'Anno non disponibile';
}

export function getDegreeProgramTypeLabel(program: DegreeProgram) {
  const years = program.durationYears;

  if (years === 3) {
    return 'Laurea triennale';
  }

  if (years === 2) {
    return 'Laurea magistrale';
  }

  return 'Anni non assegnati';
}

export function getSubjectMaxCourseYear(
  degreeProgramIds: string[],
  courseYears: CourseYear[],
  degreePrograms: DegreeProgram[]
) {
  if (degreeProgramIds.length === 0) {
    return undefined;
  }

  const maxConfiguredYear = Math.max(...courseYears.map((year) => year.year));
  const selectedYearCounts = degreeProgramIds.map(
    (degreeProgramId) =>
      degreePrograms.find((program) => program.id === degreeProgramId)
        ?.durationYears ?? maxConfiguredYear
  );

  return Math.min(...selectedYearCounts);
}
