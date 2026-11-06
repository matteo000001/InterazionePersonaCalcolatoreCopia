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
    <div className="calendar-grid">
      {days.map((day) => (
        <button
          key={day.date}
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
      ))}
    </div>
  );
}
