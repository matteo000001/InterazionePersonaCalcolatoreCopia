/** @jest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { ExamSession } from '@exam-planner/shared-types';
import {
  createCurrentSession,
  fetchCurrentSessionIfExists,
  saveCurrentSession,
} from './secretary.api';
import { SecretaryHomePage } from './secretary-home.page';

jest.mock('./secretary.api');

const session: ExamSession = {
  id: 'session-1',
  planningStart: '2026-11-02',
  planningEnd: '2026-11-30',
  sessionStart: '2027-01-11',
  sessionEnd: '2027-02-26',
  excludedHolidayDates: ['2027-01-06'],
};

async function renderPage() {
  render(<SecretaryHomePage />);
  await screen.findByRole('heading', { name: 'Configurazione sessione' });
}

describe('Configurazione sessione', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(fetchCurrentSessionIfExists).mockResolvedValue(session);
    jest.mocked(saveCurrentSession).mockImplementation(async (payload) => ({ id: 'session-1', ...payload }));
    jest.mocked(createCurrentSession).mockImplementation(async (payload) => ({ id: 'session-1', ...payload }));
  });

  afterEach(() => {
    cleanup();
  });

  it('spiega i concetti del dominio e la regola di base del sistema', async () => {
    await renderPage();

    expect(screen.getByText('Come funziona la pianificazione degli appelli')).toBeTruthy();
    expect(screen.getByText(/un solo appello al giorno/)).toBeTruthy();
    expect(screen.getAllByText(/terminare prima\s+dell'inizio della sessione/).length).toBeGreaterThan(0);

    const planningHint = screen.getByLabelText('Fine pianificazione').getAttribute('aria-describedby');
    expect(document.getElementById(planningHint ?? '')?.textContent).toContain('inseriscono, modificano ed eliminano');
    const sessionHint = screen.getByLabelText('Inizio sessione').getAttribute('aria-describedby');
    expect(document.getElementById(sessionHint ?? '')?.textContent).toContain('si svolgono gli esami');
  });
});
