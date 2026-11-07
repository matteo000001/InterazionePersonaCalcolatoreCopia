/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  it('fa scegliere le festività da un selettore di data e le mostra in formato leggibile', async () => {
    await renderPage();
    const list = screen.getByRole('list', { name: 'Festività escluse' });
    expect(within(list).getByText('mercoledì 6 gennaio 2027')).toBeTruthy();
    expect(screen.queryByPlaceholderText('2026-04-25, 2026-05-01')).toBeNull();

    const picker = screen.getByLabelText('Data da escludere');
    expect(picker.getAttribute('type')).toBe('date');
    expect(picker.getAttribute('min')).toBe('2027-01-11');
    expect(picker.getAttribute('max')).toBe('2027-02-26');

    fireEvent.change(picker, { target: { value: '2027-02-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi festività' }));
    expect(within(list).getByText('martedì 2 febbraio 2027')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi mercoledì 6 gennaio 2027' }));
    expect(within(list).queryByText('mercoledì 6 gennaio 2027')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Salva configurazione sessione' }));
    await waitFor(() => expect(saveCurrentSession).toHaveBeenCalledWith(
      expect.objectContaining({ excludedHolidayDates: ['2027-02-02'] })
    ));
  });

  it.each([
    ['2027-01-06', 'Questa data è già tra le festività escluse.'],
    ['2027-03-10', 'La data è fuori dalla sessione esami'],
    ['2027-01-16', 'La data cade di sabato o domenica'],
  ])('spiega accanto al campo perché la data %s non si può aggiungere', async (date, message) => {
    await renderPage();
    const picker = screen.getByLabelText('Data da escludere');

    fireEvent.change(picker, { target: { value: date } });

    expect(picker.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(picker.getAttribute('aria-describedby') ?? '')?.textContent)
      .toContain(message);
    expect(screen.getByRole('button', { name: 'Aggiungi festività' }).hasAttribute('disabled')).toBe(true);
  });
  it('mostra gli errori sulle festività accanto al relativo campo e in italiano', async () => {
    jest.mocked(saveCurrentSession).mockRejectedValue(
      new Error('Ogni festività esclusa deve essere una data valida (ad esempio 25/12/2026)')
    );
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Salva configurazione sessione' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ogni festività esclusa deve essere una data valida');
    expect(alert.textContent).not.toMatch(/excludedHolidayDates|ISO 8601/);
    expect(alert.closest('fieldset')?.querySelector('legend')?.textContent).toBe('Festività escluse (opzionali)');
  });

  it('mostra gli altri errori di salvataggio vicino al pulsante', async () => {
    jest.mocked(saveCurrentSession).mockRejectedValue(new Error('Failed to fetch'));
    await renderPage();
    const saveButton = screen.getByRole('button', { name: 'Salva configurazione sessione' });

    fireEvent.click(saveButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Configurazione non salvata: il server non risponde, riprova tra qualche istante.');
    expect(alert.nextElementSibling).toBe(saveButton);
  });
});
