/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { UserRole } from '@exam-planner/shared-types';
import {
  fetchSecretaryAppointments,
  fetchSecretaryCourseYears,
  fetchSecretaryDegreePrograms,
  fetchSecretarySubjects,
  fetchSecretaryUsers,
} from './secretary.api';
import { SecretaryAppointmentsSearchPage } from './secretary-appointments-search.page';

jest.mock('./secretary.api');

describe('Ricerca appelli', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(fetchSecretaryUsers).mockResolvedValue([
      { id: 1, name: 'Mario Bianchi', email: 'mario@example.com', role: UserRole.TEACHER },
    ]);
    jest.mocked(fetchSecretarySubjects).mockResolvedValue([
      { id: 10, name: 'Analisi 2', teacherId: 1, degreeProgramIds: ['ingInf'], courseYearId: 'year-2' },
    ]);
    jest.mocked(fetchSecretaryDegreePrograms).mockResolvedValue([
      { id: 'ingInf', code: 'L-8', name: 'Ingegneria Informatica', durationYears: 3 },
    ]);
    jest.mocked(fetchSecretaryCourseYears).mockResolvedValue([
      { id: 'year-1', year: 1 },
      { id: 'year-2', year: 2 },
    ]);
    jest.mocked(fetchSecretaryAppointments).mockResolvedValue([
      {
        id: 'a-1',
        teacherId: 1,
        subjectId: 10,
        degreeProgramId: 'ingInf',
        courseYearId: 'year-2',
        examDate: '2027-01-20',
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('mostra nei risultati il nome del corso e l’anno invece dei codici interni', async () => {
    render(<SecretaryAppointmentsSearchPage />);
    await screen.findByRole('heading', { name: 'Ricerca appelli' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Corso di laurea' }), { target: { value: 'ingInf' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Anno di frequenza' }), { target: { value: 'year-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Avvia ricerca' }));

    await screen.findAllByText(/Ingegneria Informatica \(L-8\) – 2° anno/);
    const row = screen.getAllByText(/Analisi 2/)
      .map((element) => element.closest('.summary-row'))
      .find(Boolean) as HTMLElement;
    expect(within(row).getByText(/Ingegneria Informatica \(L-8\) – 2° anno/)).toBeTruthy();
    expect(within(row).queryByText(/ingInf|year-2/)).toBeNull();
  });
});
