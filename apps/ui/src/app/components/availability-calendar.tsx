import { useEffect, useState } from 'react';
import type { CalendarAvailabilityDay } from '@exam-planner/shared-types';
import { formatCalendarDate } from '../shared/format-calendar-date';
import { calendarStatusLabels } from '../shared/calendar-status';

interface AvailabilityCalendarProps {
  days: CalendarAvailabilityDay[];
  selectedDate?: string;
  onSelect: (date: string) => void;
  loading?: boolean;
}

const weekdays = [
  { short: 'Lun', name: 'Lunedì' },
  { short: 'Mar', name: 'Martedì' },
  { short: 'Mer', name: 'Mercoledì' },
  { short: 'Gio', name: 'Giovedì' },
  { short: 'Ven', name: 'Venerdì' },
  { short: 'Sab', name: 'Sabato' },
  { short: 'Dom', name: 'Domenica' },
];
const monthFormatter = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});
const dayInMilliseconds = 24 * 60 * 60 * 1000;

function getCalendarMonths(days: CalendarAvailabilityDay[]) {
  const daysByMonth = new Map<string, CalendarAvailabilityDay[]>();
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const day of sortedDays) {
    const month = day.date.slice(0, 7);
    const monthDays = daysByMonth.get(month) ?? [];
    monthDays.push(day);
    daysByMonth.set(month, monthDays);
  }

  return Array.from(daysByMonth, ([month, monthDays]) => {
    const daysByDate = new Map(monthDays.map((day) => [day.date, day]));
    const firstDate = Date.parse(`${monthDays[0].date}T00:00:00.000Z`);
    const lastDate = Date.parse(`${monthDays[monthDays.length - 1].date}T00:00:00.000Z`);
    // Gli indici delle colonne partono dal lunedì. L'aritmetica UTC evita salti al cambio d'ora.
    const leadingDays = (new Date(firstDate).getUTCDay() + 6) % 7;
    const dayCount = (lastDate - firstDate) / dayInMilliseconds + 1;
    const weekCount = Math.ceil((leadingDays + dayCount) / 7);
    const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, weekdayIndex) => {
        const offset = weekIndex * 7 + weekdayIndex - leadingDays;
        const date = new Date(firstDate + offset * dayInMilliseconds)
          .toISOString().slice(0, 10);
        return daysByDate.get(date) ?? null;
      })
    );

    return { month, label: monthFormatter.format(firstDate), weeks };
  });
}

function describeDay(day: CalendarAvailabilityDay) {
  const count = day.appointments.length;
  const appointments = count === 0
    ? 'Nessun appello'
    : `${count} ${count === 1 ? 'appello' : 'appelli'}`;
  return `${formatCalendarDate(day.date)}. ${calendarStatusLabels[day.status]}. ${appointments}.`;
}

export function AvailabilityCalendar({
  days,
  selectedDate,
  onSelect,
  loading,
}: AvailabilityCalendarProps) {
  const [monthView, setMonthView] = useState<{ month?: string; selectedDate?: string }>({});

  // Una nuova selezione aggiorna il mese; il solo ricaricamento dei dati lo mantiene.
  useEffect(() => {
    setMonthView({ month: selectedDate?.slice(0, 7), selectedDate });
  }, [selectedDate]);

  const months = getCalendarMonths(days);

  if (loading) {
    return (
      <div className="calendar-empty" role="status">
        Caricamento del calendario…
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="calendar-empty">
        Nessun giorno disponibile per i filtri selezionati.
      </div>
    );
  }

  const selectedMonth = selectedDate?.slice(0, 7);
  // La navigazione resta indipendente dalla selezione finché questa non cambia.
  const requestedMonth = monthView.selectedDate === selectedDate
    ? monthView.month
    : selectedMonth;
  const currentMonth = months.find(({ month }) => month === requestedMonth)
    ?? months.find(({ month }) => month === selectedMonth)
    ?? months[0];
  const monthIndex = months.indexOf(currentMonth);

  function showMonth(month: string) {
    setMonthView({ month, selectedDate });
  }

  return (
    <div className="calendar-months">
      <div className="calendar-navigation">
        <button
          type="button"
          className="secondary"
          aria-label="Mese precedente"
          title="Mese precedente"
          disabled={monthIndex === 0}
          onClick={() => showMonth(months[monthIndex - 1]?.month ?? currentMonth.month)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <label className="calendar-month-picker">
          <span className="visually-hidden">Mese visualizzato</span>
          <select value={currentMonth.month} onChange={(event) => showMonth(event.target.value)}>
            {months.map(({ month, label }) => (
              <option key={month} value={month}>{label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary"
          aria-label="Mese successivo"
          title="Mese successivo"
          disabled={monthIndex === months.length - 1}
          onClick={() => showMonth(months[monthIndex + 1]?.month ?? currentMonth.month)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="visually-hidden" role="status">
        {currentMonth.label}. Mese {monthIndex + 1} di {months.length}.
      </p>
      <div
        key={currentMonth.month}
        className="calendar-month"
        role="region"
        aria-label={`Calendario di ${currentMonth.label}`}
        tabIndex={0}
      >
        <table className="calendar-grid">
          <caption className="visually-hidden">{currentMonth.label}</caption>
          <thead>
            <tr>
              {weekdays.map((weekday) => (
                <th key={weekday.short} scope="col" aria-label={weekday.name}>
                  <abbr title={weekday.name}>{weekday.short}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentMonth.weeks.map((week, weekIndex) => (
              <tr key={`${currentMonth.month}-${weekIndex}`}>
                {week.map((day, weekdayIndex) => (
                  <td
                    key={weekdayIndex}
                    className={day ? 'calendar-cell' : 'calendar-cell calendar-cell--empty'}
                  >
                    {day ? (
                      <button
                        type="button"
                        className={`day-card status-${day.status} ${
                          selectedDate === day.date ? 'is-selected' : ''
                        }`}
                        onClick={() => onSelect(day.date)}
                        aria-pressed={selectedDate === day.date}
                        aria-label={describeDay(day)}
                        title={describeDay(day)}
                      >
                        <time className="day-card__date" dateTime={day.date}>
                          {Number(day.date.slice(8, 10))}
                        </time>
                        {day.appointments.length > 0 ? (
                          <span className="day-card__count" aria-hidden="true">
                            {day.appointments.length} app.
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
