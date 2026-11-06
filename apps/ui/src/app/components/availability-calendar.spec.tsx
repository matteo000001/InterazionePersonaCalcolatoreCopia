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

    const button = screen.getByRole('button', { name: new RegExp(label) });
    expect(button.querySelector('time')?.getAttribute('datetime')).toBe(date);
    expect(button.querySelector('time')?.textContent).toBe(String(Number(date.slice(8, 10))));
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

    expect(screen.getAllByRole('table')).toHaveLength(1);
    const december = screen.getByRole('table', { name: 'dicembre 2026' });
    expect(weekDates(december, 0))
      .toEqual([null, null, null, '2026-12-31', null, null, null]);

    fireEvent.change(screen.getByRole('combobox', { name: 'Mese visualizzato' }), {
      target: { value: '2027-01' },
    });

    expect(screen.queryByRole('table', { name: 'dicembre 2026' })).toBeNull();
    expect(screen.getAllByRole('table')).toHaveLength(1);
    const january = screen.getByRole('table', { name: 'gennaio 2027' });
    expect(weekDates(january, 0))
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
    expect(weekDates(february, 0))
      .toEqual(['2028-02-28', '2028-02-29', null, null, null, null, null]);

    fireEvent.click(screen.getByRole('button', { name: 'Mese successivo' }));

    expect(screen.queryByRole('table', { name: 'febbraio 2028' })).toBeNull();
    const march = screen.getByRole('table', { name: 'marzo 2028' });
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

describe('Vista mensile compatta', () => {
  afterEach(cleanup);

  it('parte dal mese selezionato e consente di navigare senza cambiare la selezione', () => {
    const onSelect = jest.fn();
    render(
      <AvailabilityCalendar
        days={['2026-12-31', '2027-01-14', '2027-02-01'].map(makeDay)}
        selectedDate="2027-01-14"
        onSelect={onSelect}
      />
    );

    expect(screen.getByRole('table', { name: 'gennaio 2027' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mese successivo' }));
    expect(screen.getByRole('table', { name: 'febbraio 2027' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mese successivo' }).hasAttribute('disabled'))
      .toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Mese precedente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mese precedente' }));
    expect(screen.getByRole('table', { name: 'dicembre 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mese precedente' }).hasAttribute('disabled'))
      .toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('mantiene il mese sfogliato quando i dati vengono ricaricati', () => {
    const dates = ['2027-01-14', '2027-02-01'];
    const onSelect = jest.fn();
    const { rerender } = render(
      <AvailabilityCalendar days={dates.map(makeDay)} selectedDate="2027-01-14" onSelect={onSelect} />
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Mese visualizzato' }), {
      target: { value: '2027-02' },
    });

    rerender(
      <AvailabilityCalendar days={dates.map(makeDay)} selectedDate="2027-01-14" onSelect={onSelect} />
    );

    expect(screen.getByRole('table', { name: 'febbraio 2027' })).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('segue una nuova selezione proveniente dal dettaglio o dalla lista degli appelli', () => {
    const days = ['2027-01-14', '2027-01-15', '2027-02-01'].map(makeDay);
    const onSelect = jest.fn();
    const { rerender } = render(
      <AvailabilityCalendar days={days} selectedDate="2027-01-14" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mese successivo' }));

    rerender(<AvailabilityCalendar days={days} selectedDate="2027-01-15" onSelect={onSelect} />);
    expect(screen.getByRole('table', { name: 'gennaio 2027' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /venerdì 15 gennaio 2027/ })
      .getAttribute('aria-pressed')).toBe('true');

    rerender(<AvailabilityCalendar days={days} selectedDate="2027-02-01" onSelect={onSelect} />);
    expect(screen.getByRole('table', { name: 'febbraio 2027' })).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('non ripristina un mese sfogliato quando si torna a una selezione precedente', () => {
    const days = ['2027-01-14', '2027-01-15', '2027-02-01'].map(makeDay);
    const onSelect = jest.fn();
    const { rerender } = render(
      <AvailabilityCalendar days={days} selectedDate="2027-01-14" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mese successivo' }));
    expect(screen.getByRole('table', { name: 'febbraio 2027' })).toBeTruthy();

    rerender(<AvailabilityCalendar days={days} selectedDate="2027-01-15" onSelect={onSelect} />);
    rerender(<AvailabilityCalendar days={days} selectedDate="2027-01-14" onSelect={onSelect} />);

    expect(screen.getByRole('table', { name: 'gennaio 2027' })).toBeTruthy();
    expect(screen.queryByRole('table', { name: 'febbraio 2027' })).toBeNull();
    expect(screen.getByRole('button', { name: /giovedì 14 gennaio 2027/ })
      .getAttribute('aria-pressed')).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('sceglie un mese valido dopo il cambio dei filtri e gestisce un periodo vuoto', () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <AvailabilityCalendar
        days={['2027-01-14', '2027-02-01'].map(makeDay)}
        selectedDate="2027-01-14"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mese successivo' }));

    rerender(
      <AvailabilityCalendar days={[makeDay('2027-03-01')]} selectedDate="2027-01-14" onSelect={onSelect} />
    );
    expect(screen.getByRole('table', { name: 'marzo 2027' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mese precedente' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Mese successivo' }).hasAttribute('disabled')).toBe(true);

    rerender(<AvailabilityCalendar days={[]} onSelect={onSelect} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Nessun giorno disponibile per i filtri selezionati.')).toBeTruthy();

    rerender(<AvailabilityCalendar days={[makeDay('2027-04-01')]} onSelect={onSelect} />);
    expect(screen.getByRole('table', { name: 'aprile 2027' })).toBeTruthy();
  });

  it.each([1, 2])('mostra un indicatore compatto per %i appelli, con informazioni complete accessibili', (count) => {
    const date = '2027-01-14';
    const occupiedDay: CalendarAvailabilityDay = {
      ...makeDay(date),
      status: 'occupied',
      isSelectable: false,
      appointments: Array.from({ length: count }, (_, index) => ({
        id: `appointment-${index}`,
        teacherId: 1,
        subjectId: 1,
        degreeProgramId: 'course',
        courseYearId: 'year',
        examDate: date,
      })),
    };
    render(<AvailabilityCalendar days={[occupiedDay, makeDay('2027-01-15')]} onSelect={jest.fn()} />);

    const table = screen.getByRole('table', { name: 'gennaio 2027' });
    expect(within(table).getByText(`${count} app.`)).toBeTruthy();
    expect(within(table).queryByText('Libero')).toBeNull();
    expect(within(table).queryByText('Nessun appello')).toBeNull();
    const label = `giovedì 14 gennaio 2027. Occupato. ${count} ${count === 1 ? 'appello' : 'appelli'}.`;
    expect(within(table).getByRole('button', { name: label }).getAttribute('title')).toBe(label);
    expect(within(table).getByText('14').getAttribute('datetime')).toBe(date);
  });

  it('mantiene consultabili anche i giorni non prenotabili', () => {
    const onSelect = jest.fn();
    render(<AvailabilityCalendar days={[makeDay('2026-11-01')]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', {
      name: 'domenica 1 novembre 2026. Fine settimana. Nessun appello.',
    }));

    expect(onSelect).toHaveBeenCalledWith('2026-11-01');
  });
});
