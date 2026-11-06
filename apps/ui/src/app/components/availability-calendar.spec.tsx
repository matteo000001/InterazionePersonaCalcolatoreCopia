/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { CalendarAvailabilityDay } from '@exam-planner/shared-types';
import { AvailabilityCalendar } from './availability-calendar';

function makeDay(date: string): CalendarAvailabilityDay {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  return {
    date,
    status: weekend ? 'weekend' : 'available',
    isSelectable: !weekend,
    isPlanningOpen: true,
    appointments: [],
  };
}

function weekDates(table: HTMLElement, weekIndex: number) {
  const row = within(table).getAllByRole('row')[weekIndex + 1];
  return within(row).getAllByRole('cell').map(
    (cell) => cell.querySelector('time')?.getAttribute('datetime') ?? null
  );
}

describe('Date del calendario docente', () => {
  afterEach(cleanup);

  it.each([
    ['2027-01-14', 'giovedì 14 gennaio 2027'],
    ['2027-03-29', 'lunedì 29 marzo 2027'],
    ['2028-02-29', 'martedì 29 febbraio 2028'],
  ])('mostra %s in italiano e conserva la data originale alla selezione', (date, label) => {
    const onSelect = jest.fn();
    render(
      <AvailabilityCalendar
        days={[{
          date,
          status: 'available',
          isSelectable: true,
          isPlanningOpen: true,
          appointments: [],
        }]}
        selectedDate={date}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole('button');
    expect(screen.getByText(label).getAttribute('datetime')).toBe(date);
    expect(button.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(date);
  });
});

describe('Settimane e mesi del calendario docente', () => {
  afterEach(cleanup);

  it('allinea una sessione che inizia di giovedì sotto le sette intestazioni', () => {
    render(
      <AvailabilityCalendar
        days={['2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17'].map(makeDay)}
        onSelect={jest.fn()}
      />
    );

    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent))
      .toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']);
    for (const name of ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']) {
      expect(within(table).getByRole('columnheader', { name }).getAttribute('scope')).toBe('col');
    }
    expect(weekDates(table, 0))
      .toEqual([null, null, null, '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17']);
    expect(within(table).getAllByRole('button')).toHaveLength(4);
  });

  it('mantiene la domenica nell’ultima colonna anche quando è il primo giorno del mese', () => {
    render(
      <AvailabilityCalendar
        days={['2026-11-01', '2026-11-02'].map(makeDay)}
        onSelect={jest.fn()}
      />
    );

    const table = screen.getByRole('table', { name: 'novembre 2026' });
    expect(weekDates(table, 0)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weekDates(table, 1)).toEqual(['2026-11-02', null, null, null, null, null, null]);
  });

  it('separa e ordina dicembre e gennaio senza modificare i dati ricevuti', () => {
    const days = ['2027-01-03', '2026-12-31', '2027-01-01'].map(makeDay);
    const originalDays = [...days];
    Object.freeze(days);
    render(<AvailabilityCalendar days={days} onSelect={jest.fn()} />);

    const tables = screen.getAllByRole('table');
    expect(tables.map((table) => table.querySelector('caption')?.textContent))
      .toEqual(['dicembre 2026', 'gennaio 2027']);
    expect(weekDates(tables[0], 0))
      .toEqual([null, null, null, '2026-12-31', null, null, null]);
    expect(weekDates(tables[1], 0))
      .toEqual([null, null, null, null, '2027-01-01', null, '2027-01-03']);
    expect(days).toEqual(originalDays);
    expect(screen.getAllByRole('region').every((region) => region.tabIndex === 0)).toBe(true);
  });

  it('lascia vuoti i giorni mancanti e mantiene il lunedì nella settimana successiva', () => {
    render(
      <AvailabilityCalendar
        days={['2027-01-14', '2027-01-18'].map(makeDay)}
        onSelect={jest.fn()}
      />
    );

    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    expect(weekDates(table, 0)).toEqual([null, null, null, '2027-01-14', null, null, null]);
    expect(weekDates(table, 1)).toEqual(['2027-01-18', null, null, null, null, null, null]);
    expect(within(table).getAllByRole('button')).toHaveLength(2);
  });

  it('allinea correttamente il 29 febbraio e il successivo mese di marzo', () => {
    render(
      <AvailabilityCalendar
        days={['2028-02-28', '2028-02-29', '2028-03-01'].map(makeDay)}
        onSelect={jest.fn()}
      />
    );

    const february = screen.getByRole('table', { name: 'febbraio 2028' });
    const march = screen.getByRole('table', { name: 'marzo 2028' });
    expect(weekDates(february, 0))
      .toEqual(['2028-02-28', '2028-02-29', null, null, null, null, null]);
    expect(weekDates(march, 0)).toEqual([null, null, '2028-03-01', null, null, null, null]);
  });

  it('gestisce un mese distribuito su sei settimane con sette celle per riga', () => {
    const days = Array.from({ length: 31 }, (_, index) =>
      makeDay(`2027-08-${String(index + 1).padStart(2, '0')}`)
    );
    render(<AvailabilityCalendar days={days} onSelect={jest.fn()} />);

    const table = screen.getByRole('table', { name: 'agosto 2027' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => within(row).getAllByRole('cell').length === 7)).toBe(true);
    expect(weekDates(table, 0)[6]).toBe('2027-08-01');
    expect(weekDates(table, 5)[1]).toBe('2027-08-31');
    expect(within(table).getAllByRole('button')).toHaveLength(31);
  });
});
