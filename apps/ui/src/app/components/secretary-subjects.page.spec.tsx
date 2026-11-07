/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Subject, User, UserRole } from '@exam-planner/shared-types';
import {
  createSecretarySubject,
  deleteSecretarySubject,
  fetchSecretaryCourseYears,
  fetchSecretaryDegreePrograms,
  fetchSecretarySubjects,
  fetchSecretaryUsers,
  updateSecretarySubject,
} from './secretary.api';
import { SecretarySubjectsPage } from './secretary-subjects.page';

jest.mock('./secretary.api');

const users: User[] = [
  {
    id: 1,
    name: 'Mario Bianchi',
    email: 'mario.bianchi@example.com',
    role: UserRole.TEACHER,
    managedDegreeProgramIds: ['ingInf', 'ingGest'],
  },
];

const subjects: Subject[] = [
  {
    id: 10,
    name: 'Analisi 2',
    teacherId: 1,
    degreeProgramIds: ['ingInf', 'ingGest'],
    courseYearId: 'year-2',
  },
];

async function renderPage() {
  render(<SecretarySubjectsPage />);
  await screen.findByRole('heading', { name: 'Nuova materia' });
}

describe('Materie', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(fetchSecretaryUsers).mockResolvedValue(users);
    jest.mocked(fetchSecretarySubjects).mockResolvedValue(subjects);
    jest.mocked(fetchSecretaryDegreePrograms).mockResolvedValue([
      { id: 'ingInf', code: 'L-8', name: 'Ingegneria Informatica', durationYears: 3 },
      { id: 'ingGest', code: 'L-9', name: 'Ingegneria Gestionale', durationYears: 3 },
      { id: 'ingElet', code: 'L-8', name: 'Ingegneria Elettronica', durationYears: 3 },
    ]);
    jest.mocked(fetchSecretaryCourseYears).mockResolvedValue([
      { id: 'year-1', year: 1 },
      { id: 'year-2', year: 2 },
      { id: 'year-3', year: 3 },
    ]);
    jest.mocked(createSecretarySubject).mockResolvedValue(subjects[0]);
    jest.mocked(updateSecretarySubject).mockResolvedValue(subjects[0]);
    jest.mocked(deleteSecretarySubject).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('sceglie i corsi della materia con caselle di spunta limitate ai corsi del docente', async () => {
    await renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Docente' }), { target: { value: '1' } });
    const group = screen.getByRole('group', { name: 'Corsi di laurea' });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(2);
    expect(within(group).queryByRole('checkbox', { name: /Elettronica/ })).toBeNull();

    fireEvent.click(within(group).getByRole('checkbox', { name: 'L-8 - Ingegneria Informatica' }));
    fireEvent.click(within(group).getByRole('checkbox', { name: 'L-9 - Ingegneria Gestionale' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Fisica 1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Anno di frequenza' }), { target: { value: 'year-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi materia' }));

    await waitFor(() => expect(createSecretarySubject).toHaveBeenCalledWith({
      name: 'Fisica 1',
      teacherId: 1,
      degreeProgramIds: ['ingInf', 'ingGest'],
      courseYearId: 'year-1',
    }));
  });
});
