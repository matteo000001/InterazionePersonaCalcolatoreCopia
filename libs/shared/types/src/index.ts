export enum UserRole {
  SECRETARY = 'secretary',
  TEACHER = 'teacher',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  managedDegreeProgramIds?: string[];
}

export interface DegreeProgram {
  id: string;
  code: string;
  name: string;
  // 3 = laurea triennale, 2 = laurea magistrale, null = non indicato.
  durationYears?: number | null;
}

export interface CourseYear {
  id: string;
  year: number;
}

export interface ExamSession {
  id: string;
  sessionStart: string;
  sessionEnd: string;
  planningStart: string;
  planningEnd: string;
  excludedHolidayDates: string[];
}

export interface Subject {
  id: number;
  name: string;
  teacherId: number;
  degreeProgramIds: string[];
  courseYearId: string;
}

export interface ExamAppointment {
  id: string;
  teacherId: number;
  subjectId: number;
  degreeProgramId: string;
  courseYearId: string;
  examDate: string;
  notes?: string;
  subject?: Subject;
}

export interface AuthenticatedUser extends User {}

export type CalendarDayStatus =
  | 'available'
  | 'occupied'
  | 'weekend'
  | 'holiday'
  | 'outside-planning-window';

export interface CalendarAvailabilityDay {
  date: string;
  status: CalendarDayStatus;
  isSelectable: boolean;
  isPlanningOpen: boolean;
  reason?: string;
  appointments: ExamAppointment[];
}
