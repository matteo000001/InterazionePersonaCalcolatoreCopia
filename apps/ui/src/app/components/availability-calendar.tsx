import { CalendarAvailabilityDay } from '@exam-planner/shared-types';
import { formatCalendarDate } from '../shared/format-calendar-date';

interface AvailabilityCalendarProps {
  days: CalendarAvailabilityDay[];
  selectedDate?: string;
  onSelect: (date: string) => void;
}

const labelByStatus: Record<CalendarAvailabilityDay['status'], string> = {
  available: 'Libero',
  occupied: 'Occupato',
  weekend: 'Fine settimana',
  holiday: 'Festivita',
  'outside-planning-window': 'Bloccato',
};

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

export function AvailabilityCalendar({
  days,
  selectedDate,
  onSelect,
}: AvailabilityCalendarProps) {
  if (days.length === 0) {
    return (
      <div className="calendar-empty">
        Nessun giorno disponibile per i filtri selezionati.
      </div>
    );
  }

  return (
    <div className="calendar-months">
      {getCalendarMonths(days).map(({ month, label, weeks }) => (
        <div
          key={month}
          className="calendar-month"
          role="region"
          aria-label={`Calendario di ${label}`}
          tabIndex={0}
        >
          <table className="calendar-grid">
            <caption>{label}</caption>
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
              {weeks.map((week, weekIndex) => (
                <tr key={`${month}-${weekIndex}`}>
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
                        >
                          <time className="day-card__date" dateTime={day.date}>
                            {formatCalendarDate(day.date)}
                          </time>
                          <span className="day-card__status">{labelByStatus[day.status]}</span>
                          {day.appointments.length > 0 ? (
                            <span className="day-card__count">
                              {day.appointments.length} appello
                              {day.appointments.length > 1 ? 'i' : ''}
                            </span>
                          ) : (
                            <span className="day-card__count">Nessun appello</span>
                          )}
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
