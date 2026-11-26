import { useEffect, useState } from 'react';
import type { DegreeProgram, ExamAppointment, ExamSession } from '@exam-planner/shared-types';
import { formatCalendarDate } from '../shared/format-calendar-date';
import { fetchTeacherAppointments } from './teacher.api';

interface OwnAppointmentsProps {
  programs: DegreeProgram[];
  managedProgramIds: string[];
  session: ExamSession;
  currentId?: string;
  busy: boolean;
  onOpen: (appointment: ExamAppointment) => void;
}

type ListState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; appointments: ExamAppointment[] };

export function OwnAppointments({
  programs, managedProgramIds, session, currentId, busy, onOpen,
}: OwnAppointmentsProps) {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchTeacherAppointments().then(
      (appointments) => {
        if (!cancelled) setState({ status: 'ready', appointments });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      }
    );
    return () => { cancelled = true; };
  }, [retry]);

  return (
    <section className="own-appointments" aria-labelledby="own-appointments-title">
      <h4 id="own-appointments-title">I tuoi appelli</h4>
      <p className="field-hint">Tutti i corsi di laurea</p>
      {state.status === 'loading' && <p role="status">Caricamento dei tuoi appelli…</p>}
      {state.status === 'error' && (
        <div>
          <p role="alert">Non è stato possibile caricare i tuoi appelli.</p>
          <button type="button" className="secondary" onClick={() => setRetry((count) => count + 1)}>
            Riprova
          </button>
        </div>
      )}
      {state.status === 'ready' && state.appointments.length === 0 && (
        <p className="empty-state">Non hai ancora inserito appelli.</p>
      )}
      {state.status === 'ready' && state.appointments.map((appointment) => {
        const program = programs.find(({ id }) => id === appointment.degreeProgramId);
        const outsideSession = appointment.examDate < session.sessionStart || appointment.examDate > session.sessionEnd;
        const unavailable = outsideSession ? 'Fuori dalla sessione corrente'
          : !managedProgramIds.includes(appointment.degreeProgramId) ? 'Corso non più assegnato' : undefined;
        const content = (
          <>
            <time dateTime={appointment.examDate}>{formatCalendarDate(appointment.examDate)}</time>
            <strong>{appointment.subject?.name ?? 'Materia non disponibile'}</strong>
            <span>{program?.name ?? 'Corso non disponibile'}</span>
            <span>{appointment.notes || 'Nessuna nota'}</span>
          </>
        );
        return unavailable ? (
          <div className="compact-appointment" key={appointment.id}>
            {content}
            <small>{unavailable}</small>
          </div>
        ) : (
          <button
            type="button"
            className={`compact-appointment${appointment.id === currentId ? ' is-current' : ''}`}
            aria-current={appointment.id === currentId ? 'true' : undefined}
            key={appointment.id}
            onClick={() => onOpen(appointment)}
            disabled={busy}
            title="Apri questa giornata per modificare l'appello"
          >
            {content}
          </button>
        );
      })}
    </section>
  );
}
