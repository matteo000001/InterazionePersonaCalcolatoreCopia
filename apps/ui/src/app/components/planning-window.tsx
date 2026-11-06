import { useEffect, useState } from 'react';
import type { ExamSession } from '@exam-planner/shared-types';

type PlanningWindowProps = Pick<ExamSession, 'planningStart' | 'planningEnd'>;

const dayInMilliseconds = 24 * 60 * 60 * 1000;
const currentDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const displayDateFormatter = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function getToday() {
  const parts = Object.fromEntries(
    currentDateFormatter.formatToParts(new Date()).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toTimestamp(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function formatDate(date: string) {
  return displayDateFormatter.format(toTimestamp(date));
}

export function PlanningWindow({ planningStart, planningEnd }: PlanningWindowProps) {
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const refreshToday = () => setToday(getToday());
    const timer = window.setInterval(refreshToday, 60_000);
    window.addEventListener('focus', refreshToday);
    document.addEventListener('visibilitychange', refreshToday);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshToday);
      document.removeEventListener('visibilitychange', refreshToday);
    };
  }, []);

  const state = today < planningStart
    ? 'upcoming'
    : today > planningEnd
      ? 'closed'
      : 'open';
  const labels = {
    upcoming: 'Non ancora aperta',
    open: 'Aperta',
    closed: 'Chiusa',
  };
  // Le date senza orario sono confrontate in UTC per non risentire dell'ora legale.
  const remainingDays = Math.round(
    (toTimestamp(planningEnd) - toTimestamp(today)) / dayInMilliseconds
  ) + 1;
  const message = state === 'upcoming'
    ? `La pianificazione aprirà il ${formatDate(planningStart)}.`
    : state === 'closed'
      ? `La pianificazione si è conclusa il ${formatDate(planningEnd)}. Non puoi più inserire, modificare o eliminare appelli.`
      : remainingDays === 1
        ? 'Ultimo giorno: puoi pianificare fino alla fine di oggi.'
        : `Restano ${remainingDays} giorni per pianificare, incluso oggi.`;

  return (
    <section className="planning-window" aria-labelledby="planning-window-title">
      <div className="planning-window__header">
        <h3 id="planning-window-title">Finestra di pianificazione</h3>
        <span className={`planning-window__status planning-window__status--${state}`}>
          {labels[state]}
        </span>
      </div>
      <p className="planning-window__dates">
        Dal <time dateTime={planningStart}>{formatDate(planningStart)}</time>
        {' al '}<time dateTime={planningEnd}>{formatDate(planningEnd)}</time>.
      </p>
      <p className="planning-window__explanation">
        Solo in questo periodo puoi inserire, modificare o eliminare gli appelli.
        {' '}Le date degli esami sono quelle indicate nel calendario.
      </p>
      <p className="planning-window__message" role="status">{message}</p>
    </section>
  );
}
