/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UserRole } from '@exam-planner/shared-types';
import type { CalendarAvailabilityDay, CalendarDayStatus, ExamAppointment } from '@exam-planner/shared-types';
import { api } from '../api';
import { getAccessToken } from '../auth/auth.api';
import {
  createTeacherAppointment,
  deleteTeacherAppointment,
  fetchTeacherAppointments,
  fetchTeacherAvailability,
  fetchTeacherSubjects,
  updateTeacherAppointment,
} from './teacher.api';
import {
  fetchCurrentSession,
  fetchSecretaryCourseYears,
  fetchSecretaryDegreePrograms,
} from './secretary.api';
import { TeacherDashboard } from './teacher-dashboard';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Navigate: () => null,
}));
jest.mock('../api', () => ({ api: { getMe: jest.fn() } }));
jest.mock('../auth/auth.api', () => ({ getAccessToken: jest.fn() }));
jest.mock('./teacher.api');
jest.mock('./secretary.api');

const appointment: ExamAppointment = {
  id: 'appointment-1',
  teacherId: 1,
  subjectId: 1,
  degreeProgramId: 'course-1',
  courseYearId: 'year-1',
  examDate: '2027-01-14',
  notes: 'Nota salvata',
};
const availability: CalendarAvailabilityDay[] = [
  {
    date: '2027-01-14',
    status: 'occupied',
    isSelectable: false,
    isPlanningOpen: true,
    appointments: [appointment],
  },
  {
    date: '2027-01-15',
    status: 'available',
    isSelectable: true,
    isPlanningOpen: true,
    appointments: [],
  },
];

const stylesheet = readFileSync(join(__dirname, '../../styles.css'), 'utf8');
const ownAppointmentMessage = 'Il tuo appello è inserito in questa data.';
const closedPlanningMessage = 'La finestra di pianificazione è chiusa. Puoi consultare gli appelli, ma non inserirli, modificarli o eliminarli.';
const statusCases: Array<{
  status: CalendarDayStatus;
  label: string;
  date: string;
  reason?: string;
  message: string;
}> = [
  {
    status: 'available', label: 'Libero', date: '2027-01-14',
    message: 'Questa data è disponibile per inserire un appello.',
  },
  {
    status: 'occupied', label: 'Occupato', date: '2027-01-14', reason: 'Date already occupied',
    message: ownAppointmentMessage,
  },
  {
    status: 'weekend', label: 'Fine settimana', date: '2027-01-16', reason: 'Weekend',
    message: 'Questa data cade nel fine settimana: non è possibile pianificare appelli.',
  },
  {
    status: 'holiday', label: 'Festività', date: '2027-01-18', reason: 'Holiday',
    message: 'Questa data è una festività esclusa dalla sessione: non è possibile pianificare appelli.',
  },
  {
    status: 'outside-planning-window',
    label: 'Finestra chiusa',
    date: '2027-01-19',
    reason: 'Planning window closed',
    message: closedPlanningMessage,
  },
];

const constrainedOwnAppointmentCases: Array<{
  status: CalendarDayStatus;
  date: string;
  planningOpen: boolean;
  message: string;
}> = [
  {
    status: 'outside-planning-window', date: '2027-01-14', planningOpen: false,
    message: `${ownAppointmentMessage} ${closedPlanningMessage}`,
  },
  {
    status: 'occupied', date: '2027-01-14', planningOpen: false,
    message: `${ownAppointmentMessage} ${closedPlanningMessage}`,
  },
  {
    status: 'holiday', date: '2027-01-18', planningOpen: true,
    message: `${ownAppointmentMessage} Questa data è una festività esclusa dalla sessione: non è possibile pianificare appelli.`,
  },
  {
    status: 'weekend', date: '2027-01-16', planningOpen: false,
    message: `${ownAppointmentMessage} Questa data cade nel fine settimana: non è possibile pianificare appelli. ${closedPlanningMessage}`,
  },
];

const scrollIntoView = jest.fn();
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
let stackedLayout = false;
let reducedMotion = false;

async function renderDashboard() {
  render(<TeacherDashboard />);
  await screen.findByRole('button', { name: /venerdì 15 gennaio 2027/ });
  return screen.getByRole('complementary', { name: 'Dettaglio giornata' });
}

function setHeadingPosition(top: number, bottom: number) {
  const heading = screen.getByRole('heading', { name: 'giovedì 14 gennaio 2027' });
  jest.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom,
    left: 0,
    right: 300,
    x: 0,
    y: top,
    width: 300,
    height: bottom - top,
    toJSON: () => ({}),
  });
}

function expectDisabledWithHelp(control: HTMLElement) {
  expect(control.hasAttribute('disabled')).toBe(true);
  const descriptionId = control.getAttribute('aria-describedby');
  expect(descriptionId).toBeTruthy();
  const description = document.getElementById(descriptionId!);
  expect(description?.textContent?.trim()).toBeTruthy();
  return description!;
}

describe('Visibilità del dettaglio della giornata', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    stackedLayout = false;
    reducedMotion = false;
    jest.mocked(getAccessToken).mockReturnValue('test-token');
    jest.mocked(api.getMe).mockResolvedValue({
      id: 1,
      name: 'Docente Test',
      email: 'docente@example.com',
      role: UserRole.TEACHER,
      managedDegreeProgramIds: ['course-1', 'course-2'],
    });
    jest.mocked(fetchSecretaryDegreePrograms).mockResolvedValue([
      { id: 'course-1', code: 'C1', name: 'Primo corso' },
      { id: 'course-2', code: 'C2', name: 'Secondo corso' },
    ]);
    jest.mocked(fetchSecretaryCourseYears).mockResolvedValue([{ id: 'year-1', year: 1 }]);
    jest.mocked(fetchCurrentSession).mockResolvedValue({
      id: 'session-1',
      planningStart: '2026-10-01',
      planningEnd: '2026-11-30',
      sessionStart: '2027-01-14',
      sessionEnd: '2027-01-15',
      excludedHolidayDates: [],
    });
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([appointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue(availability);
    jest.mocked(fetchTeacherSubjects).mockResolvedValue([{
      id: 1,
      name: 'Materia Test',
      teacherId: 1,
      degreeProgramIds: ['course-1', 'course-2'],
      courseYearId: 'year-1',
    }]);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn((query: string) => ({
        matches: query === '(max-width: 980px)' ? stackedLayout : reducedMotion,
        media: query,
      })),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('non sposta la pagina o il focus durante il caricamento iniziale', async () => {
    stackedLayout = true;
    await renderDashboard();

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('su mobile mostra e focalizza il dettaglio dopo aver aggiornato la data', async () => {
    stackedLayout = true;
    const panel = await renderDashboard();
    panel.scrollTop = 300;

    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));

    const heading = screen.getByRole('heading', { name: 'venerdì 15 gennaio 2027' });
    expect(document.activeElement).toBe(heading);
    expect(panel.scrollTop).toBe(0);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollIntoView.mock.contexts).toContain(panel);
  });

  it('mostra di nuovo il dettaglio selezionando la stessa data anche da «I tuoi appelli»', async () => {
    stackedLayout = true;
    const panel = await renderDashboard();
    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    fireEvent.click(within(table).getByRole('button', { name: /giovedì 14 gennaio 2027/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    scrollIntoView.mockClear();
    panel.scrollTop = 250;

    fireEvent.click(within(panel).getByRole('button', { name: /giovedì 14 gennaio 2027.*Nota salvata/ }));

    expect(panel.scrollTop).toBe(0);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'giovedì 14 gennaio 2027' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('su desktop mantiene ferma la pagina se il dettaglio è già visibile', async () => {
    await renderDashboard();
    setHeadingPosition(40, 80);

    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'venerdì 15 gennaio 2027' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([false, true])('porta in vista un dettaglio fuori schermo rispettando movimento ridotto=%s', async (reduce) => {
    reducedMotion = reduce;
    const panel = await renderDashboard();
    setHeadingPosition(-200, -160);

    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
    expect(scrollIntoView.mock.contexts).toContain(panel);
  });

  it('non sottrae il focus ai filtri quando i dati vengono ricaricati', async () => {
    stackedLayout = true;
    await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));
    scrollIntoView.mockClear();
    jest.mocked(fetchTeacherAvailability).mockResolvedValue(availability.map((day) => ({ ...day })));
    const coursePicker = screen.getByRole('combobox', { name: 'Corso di laurea' });
    coursePicker.focus();

    fireEvent.change(coursePicker, { target: { value: 'course-2' } });
    await waitFor(() => expect(fetchTeacherAvailability).toHaveBeenCalledWith('course-2', 'year-1'));

    expect(document.activeElement).toBe(coursePicker);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('mostra la nuova data anche dopo lo spostamento riuscito di un appello', async () => {
    stackedLayout = true;
    await renderDashboard();
    const movedAppointment = { ...appointment, examDate: '2027-01-15' };
    jest.mocked(updateTeacherAppointment).mockResolvedValue(movedAppointment);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([movedAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], status: 'available', isSelectable: true, appointments: [] },
      { ...availability[1], status: 'occupied', isSelectable: false, appointments: [movedAppointment] },
    ]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sposta a' }), {
      target: { value: '2027-01-15' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sposta appello' }));

    await waitFor(() => expect(document.activeElement)
      .toBe(screen.getByRole('heading', { name: 'venerdì 15 gennaio 2027' })));
    expect(updateTeacherAppointment).toHaveBeenCalledWith('appointment-1', { examDate: '2027-01-15' });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it.each(statusCases)('uniforma lo stato $status e ne spiega il significato in italiano', async ({ status, label, date, reason, message }) => {
    const selectedDay: CalendarAvailabilityDay = {
      date,
      status,
      reason,
      isSelectable: status === 'available',
      isPlanningOpen: status !== 'outside-planning-window',
      appointments: status === 'occupied' ? [appointment] : [],
    };
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([selectedDay, availability[1]]);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue(selectedDay.appointments);
    const styleElement = document.createElement('style');
    styleElement.textContent = stylesheet;
    document.head.appendChild(styleElement);

    try {
      const panel = await renderDashboard();
      const legend = screen.getByRole('group', { name: 'Legenda del calendario' });
      const legendLabel = within(legend).getByText(label);
      const detailLabel = within(panel).getByText(label);
      expect(within(panel).getByRole('status').textContent).toBe(message);
      const table = screen.getByRole('table', { name: 'gennaio 2027' });
      const dayButton = within(table).getByRole('button', { pressed: true });
      expect(dayButton.getAttribute('aria-label')).toContain(`. ${label}.`);
      expect(dayButton.getAttribute('title')).toContain(`. ${label}.`);
      expect(dayButton.querySelector('time')?.getAttribute('datetime')).toBe(date);
      if (reason) {
        expect(within(panel).queryByText(reason)).toBeNull();
      }

      const styles = [legendLabel, dayButton, detailLabel].map((element) => {
        expect(element.classList.contains(`status-${status}`)).toBe(true);
        const computed = window.getComputedStyle(element);
        return { background: computed.backgroundColor, text: computed.color };
      });
      expect(styles[0].background).not.toBe('rgba(0, 0, 0, 0)');
      expect(styles[1]).toEqual(styles[0]);
      expect(styles[2]).toEqual(styles[0]);

      const notes = within(panel).getByRole('textbox', { name: 'Note appello' });
      const primary = within(panel).getByRole('button', {
        name: status === 'occupied' ? 'Salva note' : 'Inserisci appello in questa data',
      });
      const blocked = status !== 'available' && status !== 'occupied';
      expect(notes.hasAttribute('disabled')).toBe(blocked);
      expect(primary.hasAttribute('disabled')).toBe(blocked);
      if (blocked) {
        const help = expectDisabledWithHelp(primary);
        expect(expectDisabledWithHelp(notes)).toBe(help);
        expect(help.textContent).toContain('Inserimento non disponibile.');
        fireEvent.click(primary);
        expect(createTeacherAppointment).not.toHaveBeenCalled();
      }
    } finally {
      styleElement.remove();
    }
  });

  it('riconosce il proprio appello appena inserito senza presentarlo come errore', async () => {
    const panel = await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));
    const notes = within(panel).getByRole('textbox', { name: 'Note appello' });
    expect(notes.hasAttribute('disabled')).toBe(false);
    expect((notes as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(notes, { target: { value: 'Note del nuovo appello' } });
    const createdAppointment = {
      ...appointment, id: 'appointment-2', examDate: '2027-01-15', notes: 'Note del nuovo appello',
    };
    jest.mocked(createTeacherAppointment).mockResolvedValue(createdAppointment);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([appointment, createdAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      availability[0],
      {
        ...availability[1],
        status: 'occupied',
        isSelectable: false,
        reason: 'Date already occupied',
        appointments: [createdAppointment],
      },
    ]);

    fireEvent.click(within(panel).getByRole('button', { name: 'Inserisci appello in questa data' }));

    await waitFor(() => expect(within(panel).getByRole('status').textContent).toBe(ownAppointmentMessage));
    expect(createTeacherAppointment).toHaveBeenCalledWith(expect.objectContaining({
      subjectId: 1,
      degreeProgramId: 'course-1',
      examDate: '2027-01-15',
      notes: 'Note del nuovo appello',
    }));
    expect(within(panel).queryByText('Date already occupied')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([1, 2])('distingue %i appelli altrui da quelli del docente autenticato', async (count) => {
    const otherAppointments = Array.from({ length: count }, (_, index) => ({
      ...appointment,
      id: `other-appointment-${index}`,
      teacherId: index + 2,
    }));
    jest.mocked(fetchTeacherAppointments).mockResolvedValue(otherAppointments);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], reason: 'Date already occupied', appointments: otherAppointments },
      availability[1],
    ]);

    const panel = await renderDashboard();

    expect(within(panel).getByRole('status').textContent).toBe(count === 1
      ? 'In questa data è già presente un appello di un altro docente.'
      : 'In questa data sono già presenti appelli di altri docenti.');
    expect(within(panel).queryByText(ownAppointmentMessage)).toBeNull();
    const primary = within(panel).getByRole('button', { name: 'Inserisci appello in questa data' });
    const help = expectDisabledWithHelp(primary);
    expect(expectDisabledWithHelp(within(panel).getByRole('textbox', { name: 'Note appello' }))).toBe(help);
    expect(help.textContent).toContain('La data è già occupata. Scegli una data libera nel calendario.');
    fireEvent.click(primary);
    expect(createTeacherAppointment).not.toHaveBeenCalled();
  });

  it('segnala correttamente la presenza di appelli propri e di altri docenti', async () => {
    const appointments = [appointment, { ...appointment, id: 'other-appointment', teacherId: 2 }];
    jest.mocked(fetchTeacherAppointments).mockResolvedValue(appointments);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], appointments },
      availability[1],
    ]);

    const panel = await renderDashboard();

    expect(within(panel).getByRole('status').textContent)
      .toBe('In questa data sono presenti appelli tuoi e di altri docenti.');
    expectDisabledWithHelp(within(panel).getByRole('textbox', { name: 'Note appello' }));
    expectDisabledWithHelp(within(panel).getByRole('button', { name: 'Salva note' }));
    expect(within(panel).getByRole('button', { name: 'Elimina' }).hasAttribute('disabled')).toBe(false);
  });

  it.each(constrainedOwnAppointmentCases)('mantiene visibili i vincoli $status anche con un proprio appello', async ({ status, date, planningOpen, message }) => {
    const ownAppointment = { ...appointment, examDate: date };
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([ownAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      {
        date,
        status,
        isSelectable: false,
        isPlanningOpen: planningOpen,
        reason: 'Server reason in English',
        appointments: [ownAppointment],
      },
      availability[1],
    ]);

    const panel = await renderDashboard();

    expect(within(panel).getByRole('status').textContent).toBe(message);
    expect(within(panel).queryByText('Server reason in English')).toBeNull();
    expectDisabledWithHelp(within(panel).getByRole('textbox', { name: 'Note appello' }));
    for (const name of ['Salva note', 'Elimina']) {
      const button = within(panel).getByRole('button', { name });
      expectDisabledWithHelp(button);
      fireEvent.click(button);
    }
    expect(updateTeacherAppointment).not.toHaveBeenCalled();
    expect(deleteTeacherAppointment).not.toHaveBeenCalled();
    const movePicker = within(panel).getByRole('combobox', { name: 'Sposta a' });
    expect(movePicker.hasAttribute('disabled')).toBe(!planningOpen);
    if (planningOpen) {
      fireEvent.change(movePicker, { target: { value: '2027-01-15' } });
      expect(within(panel).getByRole('button', { name: 'Sposta appello' }).hasAttribute('disabled')).toBe(false);
    } else {
      expectDisabledWithHelp(movePicker);
      expectDisabledWithHelp(within(panel).getByRole('button', { name: 'Sposta appello' }));
    }
  });

  it('spiega perché servono una materia e una data valida prima di compilare nuove note', async () => {
    jest.mocked(fetchTeacherSubjects).mockResolvedValue([]);
    const panel = await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));

    const primary = within(panel).getByRole('button', { name: 'Inserisci appello in questa data' });
    const help = expectDisabledWithHelp(primary);
    expect(expectDisabledWithHelp(within(panel).getByRole('textbox', { name: 'Note appello' }))).toBe(help);
    expect(help.textContent).toContain('Seleziona una materia per inserire un appello e compilare le note.');
    fireEvent.click(primary);
    expect(createTeacherAppointment).not.toHaveBeenCalled();
  });

  it.each([true, false])('consente di salvare le note del proprio appello occupato, materia nel filtro=%s', async (subjectPresent) => {
    if (!subjectPresent) {
      jest.mocked(fetchTeacherSubjects).mockResolvedValue([]);
    }
    const panel = await renderDashboard();
    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    fireEvent.click(within(table).getByRole('button', { name: /giovedì 14 gennaio 2027/ }));
    const notes = within(panel).getByRole('textbox', { name: 'Note appello' });
    expect(notes.hasAttribute('disabled')).toBe(false);
    expect((notes as HTMLTextAreaElement).value).toBe('Nota salvata');
    // Un solo comando modifica le note e non richiede una materia nel filtro.
    expect(within(panel).getAllByRole('button', { name: /Salva note|Aggiorna/ })).toHaveLength(1);
    expect(within(panel).getByRole('button', { name: 'Salva note' }).hasAttribute('disabled')).toBe(false);
    expect(within(panel).getByRole('button', { name: 'Elimina' }).hasAttribute('disabled')).toBe(false);
    expect(within(panel).getByRole('combobox', { name: 'Sposta a' }).hasAttribute('disabled')).toBe(false);
    const updatedAppointment = { ...appointment, notes: 'Nota aggiornata' };
    jest.mocked(updateTeacherAppointment).mockResolvedValue(updatedAppointment);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([updatedAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], appointments: [updatedAppointment] }, availability[1],
    ]);

    fireEvent.change(notes, { target: { value: 'Nota aggiornata' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Salva note' }));

    await waitFor(() => expect(updateTeacherAppointment).toHaveBeenCalledWith('appointment-1', {
      notes: 'Nota aggiornata',
    }));
    expect(await within(panel).findByText('Note dell’appello salvate')).toBeTruthy();
  });

  it('spiega quando non esistono destinazioni libere senza bloccare le note modificabili', async () => {
    const otherAppointment = { ...appointment, id: 'other-appointment', teacherId: 2, examDate: '2027-01-15' };
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      availability[0],
      { ...availability[1], status: 'occupied', isSelectable: false, appointments: [otherAppointment] },
    ]);
    const panel = await renderDashboard();

    const picker = within(panel).getByRole('combobox', { name: 'Sposta a' });
    const moveButton = within(panel).getByRole('button', { name: 'Sposta appello' });
    const help = expectDisabledWithHelp(moveButton);
    expect(expectDisabledWithHelp(picker)).toBe(help);
    expect(help.textContent).toBe('Non ci sono date libere disponibili per lo spostamento.');
    expect(within(panel).getByRole('textbox', { name: 'Note appello' }).hasAttribute('disabled')).toBe(false);
  });

  it('rivalida la destinazione dopo un aggiornamento dei dati e permette di sceglierne un’altra', async () => {
    const thirdDay: CalendarAvailabilityDay = {
      ...availability[1], date: '2027-01-18',
    };
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([...availability, thirdDay]);
    const panel = await renderDashboard();
    const picker = within(panel).getByRole('combobox', { name: 'Sposta a' });
    const moveButton = within(panel).getByRole('button', { name: 'Sposta appello' });
    fireEvent.change(picker, { target: { value: '2027-01-15' } });
    expect(moveButton.hasAttribute('disabled')).toBe(false);
    const updatedAppointment = { ...appointment, notes: 'Nota aggiornata' };
    const otherAppointment = { ...appointment, id: 'other-appointment', teacherId: 2, examDate: '2027-01-15' };
    jest.mocked(updateTeacherAppointment).mockResolvedValue(updatedAppointment);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([updatedAppointment, otherAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], appointments: [updatedAppointment] },
      { ...availability[1], status: 'occupied', isSelectable: false, appointments: [otherAppointment] },
      thirdDay,
    ]);

    fireEvent.change(within(panel).getByRole('textbox', { name: 'Note appello' }), {
      target: { value: 'Nota aggiornata' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Salva note' }));

    await waitFor(() => expect(expectDisabledWithHelp(moveButton).textContent)
      .toBe('La data scelta non è più disponibile. Scegli un’altra data libera.'));
    jest.mocked(updateTeacherAppointment).mockClear();
    fireEvent.click(moveButton);
    expect(updateTeacherAppointment).not.toHaveBeenCalled();
    expect(picker.hasAttribute('disabled')).toBe(false);
    fireEvent.change(picker, { target: { value: '2027-01-18' } });
    expect(moveButton.hasAttribute('disabled')).toBe(false);
  });

  it('permette di spostare un proprio appello da una festività a una data libera valida', async () => {
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], status: 'holiday', isSelectable: false }, availability[1],
    ]);
    const panel = await renderDashboard();
    expectDisabledWithHelp(within(panel).getByRole('textbox', { name: 'Note appello' }));
    const movedAppointment = { ...appointment, examDate: '2027-01-15' };
    jest.mocked(updateTeacherAppointment).mockResolvedValue(movedAppointment);
    jest.mocked(fetchTeacherAppointments).mockResolvedValue([movedAppointment]);
    jest.mocked(fetchTeacherAvailability).mockResolvedValue([
      { ...availability[0], status: 'holiday', isSelectable: false, appointments: [] },
      { ...availability[1], status: 'occupied', isSelectable: false, appointments: [movedAppointment] },
    ]);

    fireEvent.change(within(panel).getByRole('combobox', { name: 'Sposta a' }), {
      target: { value: '2027-01-15' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Sposta appello' }));

    await waitFor(() => expect(updateTeacherAppointment)
      .toHaveBeenCalledWith('appointment-1', { examDate: '2027-01-15' }));
    await waitFor(() => expect(within(panel).getByRole('textbox', { name: 'Note appello' })
      .hasAttribute('disabled')).toBe(false));
  });

  it('spiega il blocco temporaneo durante il salvataggio e riabilita i controlli al termine', async () => {
    const panel = await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));
    let completeCreate: (value: ExamAppointment) => void;
    const pendingCreate = new Promise<ExamAppointment>((resolve) => { completeCreate = resolve; });
    jest.mocked(createTeacherAppointment).mockReturnValue(pendingCreate);
    const primary = within(panel).getByRole('button', { name: 'Inserisci appello in questa data' });
    const notes = within(panel).getByRole('textbox', { name: 'Note appello' });

    fireEvent.click(primary);

    try {
      expect(expectDisabledWithHelp(primary).textContent).toBe('Operazione in corso. Attendi il completamento.');
      expectDisabledWithHelp(notes);
    } finally {
      await act(async () => {
        completeCreate({ ...appointment, id: 'appointment-2', examDate: '2027-01-15' });
        await pendingCreate;
      });
    }
    await waitFor(() => expect(primary.hasAttribute('disabled')).toBe(false));
    expect(notes.hasAttribute('disabled')).toBe(false);
  });
  it('mostra la conferma accanto ai pulsanti e la rimuove quando si cambia giorno', async () => {
    const panel = await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));
    jest.mocked(createTeacherAppointment).mockResolvedValue({
      ...appointment, id: 'appointment-2', examDate: '2027-01-15',
    });

    fireEvent.click(within(panel).getByRole('button', { name: 'Inserisci appello in questa data' }));

    const confirmation = await within(panel).findByText('Appello inserito correttamente');
    expect(confirmation.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.getAllByText('Appello inserito correttamente')).toHaveLength(1);

    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    fireEvent.click(within(table).getByRole('button', { name: /giovedì 14 gennaio 2027/ }));

    expect(within(panel).queryByText('Appello inserito correttamente')).toBeNull();
  });

  it('nasconde automaticamente la conferma dopo qualche secondo', async () => {
    jest.useFakeTimers();
    try {
      const panel = await renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ }));
      jest.mocked(createTeacherAppointment).mockResolvedValue({
        ...appointment, id: 'appointment-2', examDate: '2027-01-15',
      });
      fireEvent.click(within(panel).getByRole('button', { name: 'Inserisci appello in questa data' }));
      await within(panel).findByText('Appello inserito correttamente');

      act(() => {
        jest.advanceTimersByTime(6000);
      });
      expect(within(panel).queryByText('Appello inserito correttamente')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
  it('svuota calendario e anno quando si deseleziona il corso e li ripristina riselezionandolo', async () => {
    const panel = await renderDashboard();
    const coursePicker = screen.getByRole('combobox', { name: 'Corso di laurea' });

    fireEvent.change(coursePicker, { target: { value: '' } });

    expect(screen.queryByRole('table', { name: 'gennaio 2027' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Legenda del calendario' })).toBeNull();
    expect(screen.getByText('Seleziona un corso di laurea per vedere il calendario degli appelli.')).toBeTruthy();
    expect(screen.getByText('Seleziona prima il corso')).toBeTruthy();
    expect(screen.queryByText('1° anno')).toBeNull();
    expect(within(panel).getByText('Seleziona un corso di laurea per vedere il dettaglio delle giornate.')).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Materia' }) as HTMLSelectElement).value).toBe('');

    fireEvent.change(coursePicker, { target: { value: 'course-2' } });

    await screen.findByRole('table', { name: 'gennaio 2027' });
    expect(fetchTeacherAvailability).toHaveBeenLastCalledWith('course-2', 'year-1');
    expect(screen.getByText('1° anno')).toBeTruthy();
  });
});
