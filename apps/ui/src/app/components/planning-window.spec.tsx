/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlanningWindow } from './planning-window';

const planningDates = {
  planningStart: '2026-10-01',
  planningEnd: '2026-11-30',
};

describe('Finestra di pianificazione', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-06T12:00:00.000Z'));
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('spiega il periodo e mostra i giorni rimasti includendo oggi', () => {
    render(<PlanningWindow {...planningDates} />);

    expect(screen.getByText('Aperta')).toBeTruthy();
    expect(screen.getByText('1 ottobre 2026')).toBeTruthy();
    expect(screen.getByText('30 novembre 2026')).toBeTruthy();
    expect(screen.getByText(/Solo in questo periodo puoi inserire, modificare o eliminare/))
      .toBeTruthy();
    expect(screen.getByRole('status').textContent)
      .toBe('Restano 25 giorni per pianificare, incluso oggi.');
  });

  it('mostra la data di apertura quando il periodo non è ancora iniziato', () => {
    jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
    render(<PlanningWindow {...planningDates} />);

    expect(screen.getByText('Non ancora aperta')).toBeTruthy();
    expect(screen.getByRole('status').textContent)
      .toBe('La pianificazione aprirà il 1 ottobre 2026.');
  });

  it('include il primo giorno della finestra', () => {
    jest.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    render(<PlanningWindow {...planningDates} />);

    expect(screen.getByText('Aperta')).toBeTruthy();
    expect(screen.getByRole('status').textContent)
      .toBe('Restano 61 giorni per pianificare, incluso oggi.');
  });

  it('segnala l’ultimo giorno anziché mostrare zero giorni rimasti', () => {
    jest.setSystemTime(new Date('2026-11-30T12:00:00.000Z'));
    render(<PlanningWindow {...planningDates} />);

    expect(screen.getByText('Aperta')).toBeTruthy();
    expect(screen.getByRole('status').textContent)
      .toBe('Ultimo giorno: puoi pianificare fino alla fine di oggi.');
  });

  it('gestisce una finestra di un solo giorno', () => {
    render(<PlanningWindow planningStart="2026-11-06" planningEnd="2026-11-06" />);

    expect(screen.getByText('Aperta')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Ultimo giorno');
  });

  it('non mostra giorni negativi dopo la chiusura', () => {
    jest.setSystemTime(new Date('2026-12-02T12:00:00.000Z'));
    render(<PlanningWindow {...planningDates} />);

    expect(screen.getByText('Chiusa')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('si è conclusa il 30 novembre 2026');
    expect(screen.queryByText(/Restano/)).toBeNull();
  });

  it('conta correttamente i giorni attraverso il cambio di ora legale', () => {
    jest.setSystemTime(new Date('2026-10-24T12:00:00.000Z'));
    render(<PlanningWindow planningStart="2026-10-01" planningEnd="2026-10-31" />);

    expect(screen.getByRole('status').textContent)
      .toBe('Restano 8 giorni per pianificare, incluso oggi.');
  });

  it('conta correttamente i giorni attraverso il cambio di anno', () => {
    jest.setSystemTime(new Date('2026-12-31T12:00:00.000Z'));
    render(<PlanningWindow planningStart="2026-12-30" planningEnd="2027-01-02" />);

    expect(screen.getByRole('status').textContent)
      .toBe('Restano 3 giorni per pianificare, incluso oggi.');
  });

  it('aggiorna la chiusura a mezzanotte italiana anche se la data UTC è ancora novembre', () => {
    jest.setSystemTime(new Date('2026-11-30T22:59:30.000Z'));
    render(<PlanningWindow {...planningDates} />);
    expect(screen.getByText('Aperta')).toBeTruthy();

    act(() => jest.advanceTimersByTime(60_000));

    expect(screen.getByText('Chiusa')).toBeTruthy();
  });

  it('aggiorna lo stato quando si torna alla pagina', () => {
    render(<PlanningWindow {...planningDates} />);
    jest.setSystemTime(new Date('2026-12-01T12:00:00.000Z'));

    fireEvent.focus(window);

    expect(screen.getByText('Chiusa')).toBeTruthy();
  });
});
