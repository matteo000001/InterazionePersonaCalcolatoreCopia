import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  CalendarAvailabilityDay,
  CourseYear,
  DegreeProgram,
  ExamAppointment,
  ExamSession,
  Subject,
  User,
  UserRole,
} from '@exam-planner/shared-types';
import { AvailabilityCalendar } from './availability-calendar';
import { PlanningWindow } from './planning-window';
import { api } from '../api';
import { getAccessToken } from '../auth/auth.api';
import { usePageTitle } from '../shared/use-page-title';
import { formatCalendarDate } from '../shared/format-calendar-date';
import {
  calendarStatusLabels,
  getCalendarDateBlockReason,
  getCalendarDayMessage,
  isCalendarDayAvailable,
} from '../shared/calendar-status';
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

const SUCCESS_MESSAGE_DURATION_MS = 6000;

export function TeacherDashboard() {
  usePageTitle('Pannello docente');
  const navigate = useNavigate();
  const token = getAccessToken();
  const [user, setUser] = useState<User | null>(null);
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([]);
  const [courseYears, setCourseYears] = useState<CourseYear[]>([]);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [appointments, setAppointments] = useState<ExamAppointment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availability, setAvailability] = useState<CalendarAvailabilityDay[]>([]);
  const [selectedDegreeProgramId, setSelectedDegreeProgramId] = useState('');
  const [selectedCourseYearId, setSelectedCourseYearId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [moveTargetDate, setMoveTargetDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState(0);
  const detailPanelRef = useRef<HTMLElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);

  const visibleDegreePrograms =
    user?.managedDegreeProgramIds && user.managedDegreeProgramIds.length > 0
      ? degreePrograms.filter((program) =>
          user.managedDegreeProgramIds?.includes(program.id)
        )
      : [];
  const selectedCourseYear = courseYears.find(
    (year) => year.id === selectedCourseYearId
  );
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);
  const selectedDay = availability.find((day) => day.date === selectedDate);
  const ownAppointmentOnSelectedDay = selectedDay?.appointments.find(
    (appointment) => appointment.teacherId === user?.id
  );
  const ownAppointments = user
    ? appointments.filter((appointment) => appointment.teacherId === user.id)
    : [];
  const moveTargetDays = availability.filter(isCalendarDayAvailable);
  const selectedMoveTarget = moveTargetDays.find((day) => day.date === moveTargetDate);

  // Il messaggio di conferma si riferisce all'ultima azione: scompare da solo dopo
  // qualche secondo e viene rimosso appena l'utente cambia giorno, corso o materia.
  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(
      () => setSuccessMessage(null),
      SUCCESS_MESSAGE_DURATION_MS
    );
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (detailRequest === 0) {
      return;
    }

    const panel = detailPanelRef.current;
    const heading = detailHeadingRef.current;
    if (!panel || !heading) {
      return;
    }

    panel.scrollTop = 0;
    heading.focus({ preventScroll: true });
    const bounds = heading.getBoundingClientRect();
    const stackedLayout = window.matchMedia('(max-width: 980px)').matches;
    const headingVisible = bounds.top >= 0 && bounds.bottom <= window.innerHeight;

    if (stackedLayout || !headingVisible) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [detailRequest]);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError(null);

      try {
        const [me, programs, years, currentSession] = await Promise.all([
          api.getMe(token),
          fetchSecretaryDegreePrograms(),
          fetchSecretaryCourseYears(),
          fetchCurrentSession(),
        ]);

        setUser(me);
        setDegreePrograms(programs);
        setCourseYears(years);
        setSession(currentSession);

        if (me.role !== UserRole.TEACHER) {
          return;
        }

        const firstProgram = programs.find((program) =>
          me.managedDegreeProgramIds?.includes(program.id)
        );

        setSelectedDegreeProgramId(firstProgram?.id ?? '');
        setSelectedCourseYearId(years[0]?.id ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [token]);

  useEffect(() => {
    if (!user || !selectedDegreeProgramId || !selectedCourseYearId) {
      return undefined;
    }

    // Evita che una risposta arrivata dopo un cambio di filtro sovrascriva
    // il calendario del corso attualmente selezionato.
    let cancelled = false;

    async function loadTeacherData() {
      try {
        const [loadedAppointments, loadedAvailability, loadedSubjects] =
          await Promise.all([
            fetchTeacherAppointments({
              degreeProgramId: selectedDegreeProgramId,
              courseYearId: selectedCourseYearId,
            }),
            fetchTeacherAvailability(selectedDegreeProgramId, selectedCourseYearId),
            fetchTeacherSubjects({
              teacherId: user.id,
              degreeProgramId: selectedDegreeProgramId,
            }),
          ]);

        if (cancelled) {
          return;
        }

        setAppointments(loadedAppointments);
        setAvailability(loadedAvailability);
        setSubjects(loadedSubjects);
        setSelectedSubjectId((currentSubjectId) => {
          const nextSubject =
            loadedSubjects.find((subject) => subject.id === currentSubjectId) ??
            loadedSubjects[0];

          if (nextSubject) {
            setSelectedCourseYearId(nextSubject.courseYearId);
            return nextSubject.id;
          }

          return '';
        });
        setSelectedDate((currentDate) => currentDate ?? loadedAvailability[0]?.date);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Caricamento fallito');
        }
      }
    }

    void loadTeacherData();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseYearId, selectedDegreeProgramId, user]);

  async function refreshTeacherData() {
    if (!user || !selectedDegreeProgramId || !selectedCourseYearId) {
      return;
    }

    const [loadedAppointments, loadedAvailability, loadedSubjects] =
      await Promise.all([
        fetchTeacherAppointments({
          degreeProgramId: selectedDegreeProgramId,
          courseYearId: selectedCourseYearId,
        }),
        fetchTeacherAvailability(selectedDegreeProgramId, selectedCourseYearId),
        fetchTeacherSubjects({
          teacherId: user.id,
          degreeProgramId: selectedDegreeProgramId,
        }),
      ]);

    setAppointments(loadedAppointments);
    setAvailability(loadedAvailability);
    setSubjects(loadedSubjects);
    setSelectedSubjectId((currentSubjectId) => {
      const nextSubject =
        loadedSubjects.find((subject) => subject.id === currentSubjectId) ??
        loadedSubjects[0];

      if (nextSubject) {
        setSelectedCourseYearId(nextSubject.courseYearId);
        return nextSubject.id;
      }

      return '';
    });
  }

  function selectSubject(subjectId: number | '') {
    setSelectedSubjectId(subjectId);
    setSuccessMessage(null);

    if (subjectId === '') {
      return;
    }

    const subject = subjects.find((currentSubject) => currentSubject.id === subjectId);

    if (!subject) {
      return;
    }

    setSelectedCourseYearId(subject.courseYearId);
  }

  function requestDayDetail() {
    setDetailRequest((current) => current + 1);
  }

  function selectDay(date: string) {
    setSelectedDate(date);
    setSuccessMessage(null);
    setMoveTargetDate('');
    const ownAppointment =
      availability
        .find((day) => day.date === date)
        ?.appointments.find((appointment) => appointment.teacherId === user?.id);
    setNotes(ownAppointment?.notes ?? '');
    requestDayDetail();
  }

  function selectDegreeProgram(degreeProgramId: string) {
    setSelectedDegreeProgramId(degreeProgramId);
    setSelectedSubjectId('');
    setNotes('');
    setMoveTargetDate('');
    setSuccessMessage(null);

    if (!degreeProgramId) {
      // Nessun corso selezionato: il calendario e i filtri dipendenti vengono
      // svuotati, così ciò che si vede corrisponde ai filtri impostati.
      setSelectedCourseYearId('');
      setSubjects([]);
      setAppointments([]);
      setAvailability([]);
      setSelectedDate(undefined);
      return;
    }

    setSelectedCourseYearId((current) => current || courseYears[0]?.id || '');
  }

  async function handleMutation(action: () => Promise<void>, success: string) {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await action();
      setSuccessMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <main className="app-shell loading-screen">Caricamento in corso...</main>;
  }

  if (user?.role === UserRole.SECRETARY) {
    return <Navigate to="/secretary" replace />;
  }

  if (!user || !session) {
    return (
      <main className="app-shell">
        <section className="panel">
          <p className="eyebrow">Dati calendario</p>
          <h2>Il calendario non può essere costruito</h2>
          <p className="hero-copy">
            Verifica che esistano una sessione corrente, almeno un corso di laurea
            e almeno un anno di corso.
          </p>
          <div className="alert error" role="alert">
            {error ?? 'Dati di calendario mancanti nel database'}
          </div>
        </section>
      </main>
    );
  }

  const dateBlockReason = getCalendarDateBlockReason(selectedDay);
  const hasSelectedSubject = subjects.some((subject) => subject.id === selectedSubjectId);
  const editBlockReason = dateBlockReason ?? (
    ownAppointmentOnSelectedDay && selectedDay.appointments.length > 1
      ? 'Sono presenti più appelli in questa data. Sposta o elimina il tuo appello prima di modificarlo.'
      : undefined
  );
  const createBlockReason = dateBlockReason ?? (
    selectedDay && !isCalendarDayAvailable(selectedDay)
      ? selectedDay.appointments.length > 0 || selectedDay.status === 'occupied'
        ? 'La data è già occupata. Scegli una data libera nel calendario.'
        : 'La data selezionata non è disponibile. Scegli una data libera nel calendario.'
      : !hasSelectedSubject
        ? 'Seleziona una materia per inserire un appello e compilare le note.'
        : undefined
  );
  // Per un appello già inserito l'unica modifica possibile da qui sono le note:
  // non serve quindi una materia selezionata nel filtro.
  const primaryBlockReason = ownAppointmentOnSelectedDay
    ? editBlockReason
    : createBlockReason;
  const notesBlockReason = ownAppointmentOnSelectedDay ? editBlockReason : createBlockReason;
  const busyReason = isSubmitting ? 'Operazione in corso. Attendi il completamento.' : undefined;
  const actionHelp = busyReason ?? (primaryBlockReason
    ? `${ownAppointmentOnSelectedDay ? 'Modifica delle note' : 'Inserimento'} non disponibile. ${primaryBlockReason}`
    : undefined);
  const planningBlockReason = selectedDay && (!selectedDay.isPlanningOpen || selectedDay.status === 'outside-planning-window')
    ? 'La finestra di pianificazione è chiusa.'
    : undefined;
  const moveBlockReason = busyReason ?? planningBlockReason ?? (
    moveTargetDays.length === 0
      ? 'Non ci sono date libere disponibili per lo spostamento.'
      : !selectedMoveTarget
        ? moveTargetDate
          ? 'La data scelta non è più disponibile. Scegli un’altra data libera.'
          : 'Scegli una data libera nel menu «Sposta a».'
        : undefined
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-card teacher-header">
          <h1>Pannello docente</h1>

          <div className="teacher-user-menu">
            <strong>{user.name}</strong>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/logout')}
            >
              Esci
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="alert error" role="alert">{error}</div> : null}

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel__header">
            <h2>Calendario appelli</h2>
          </div>

          <PlanningWindow
            planningStart={session.planningStart}
            planningEnd={session.planningEnd}
          />

          {visibleDegreePrograms.length === 0 ? (
            <div className="calendar-empty no-programs-notice">
              <div>
                <strong>Non hai ancora corsi di laurea assegnati.</strong>
                <p>
                  Per pianificare gli appelli la segreteria didattica deve
                  assegnarti almeno un corso di laurea e le relative materie.
                  Contatta la segreteria indicando il tuo nome e l'email con cui
                  accedi ({user.email}).
                </p>
              </div>
            </div>
          ) : (
          <>
          <div className="filters teacher-filters">
            <label>
              Corso di laurea
              <select
                value={selectedDegreeProgramId}
                onChange={(event) => selectDegreeProgram(event.target.value)}
              >
                <option value="">Seleziona corso di laurea</option>
                {visibleDegreePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Anno di frequenza
              <span className={`readonly-value${selectedCourseYear ? '' : ' is-placeholder'}`}>
                {selectedCourseYear
                  ? `${selectedCourseYear.year}° anno`
                  : 'Seleziona prima il corso'}
              </span>
            </label>

            <label>
              Materia
              <select
                value={selectedSubjectId}
                title={selectedSubject?.name}
                onChange={(event) =>
                  selectSubject(event.target.value ? Number(event.target.value) : '')
                }
              >
                <option value="">Seleziona materia</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedDegreeProgramId ? (
            <>
              <div className="legend" role="group" aria-label="Legenda del calendario">
                {Object.entries(calendarStatusLabels).map(([status, label]) => (
                  <span key={status} className={`legend-pill status-${status}`}>{label}</span>
                ))}
              </div>

              <AvailabilityCalendar
                days={availability}
                selectedDate={selectedDate}
                onSelect={selectDay}
              />
            </>
          ) : (
            <div className="calendar-empty">
              <p>
                Seleziona un corso di laurea per vedere il calendario degli appelli.
              </p>
            </div>
          )}
          </>
          )}
        </div>

        <aside
          ref={detailPanelRef}
          className="panel side-panel teacher-day-detail"
          aria-label="Dettaglio giornata"
        >
          <div className="day-detail-header">
            <div>
              <p className="eyebrow">Dettaglio giornata</p>
              <h3 ref={detailHeadingRef} tabIndex={-1}>
                {selectedDate ? (
                  <time dateTime={selectedDate}>{formatCalendarDate(selectedDate)}</time>
                ) : 'Seleziona una data'}
              </h3>
            </div>
            {selectedDay ? (
              <span className={`status-label status-${selectedDay.status}`}>
                {calendarStatusLabels[selectedDay.status]}
              </span>
            ) : null}
          </div>

          {selectedDay ? (
            <>
              <p className="day-detail-description" role="status">
                {getCalendarDayMessage(selectedDay, user.id)}
              </p>
              <div className="appointment-list">
                {selectedDay.appointments.length > 0 ? (
                  selectedDay.appointments.map((appointment) => (
                    <article className="appointment-card" key={appointment.id}>
                      <strong>
                        {appointment.subject?.name ??
                          (appointment.teacherId === user.id
                            ? 'Il tuo appello'
                            : 'Appello collega')}
                      </strong>
                      <span>{appointment.notes || 'Nessuna nota'}</span>
                      {appointment.teacherId === user.id ? (
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              void handleMutation(async () => {
                                await deleteTeacherAppointment(appointment.id);
                                await refreshTeacherData();
                                setNotes('');
                              }, 'Appello eliminato')
                            }
                            disabled={isSubmitting || Boolean(dateBlockReason)}
                            aria-describedby={isSubmitting || dateBlockReason ? 'appointment-action-help' : undefined}
                          >
                            Elimina
                          </button>
                        </div>
                      ) : null}
                      {appointment.teacherId === user.id ? (
                        <div className="move-appointment">
                          <label className="compact-field">
                            Sposta a
                            <select
                              value={moveTargetDate}
                              onChange={(event) => setMoveTargetDate(event.target.value)}
                              disabled={isSubmitting || Boolean(planningBlockReason) || moveTargetDays.length === 0}
                              aria-describedby={moveBlockReason ? `appointment-move-help-${appointment.id}` : undefined}
                            >
                              <option value="">
                                {moveTargetDays.length > 0
                                  ? 'Scegli una data libera'
                                  : 'Nessuna data libera disponibile'}
                              </option>
                              {moveTargetDays.map((day) => (
                                <option key={day.date} value={day.date}>
                                  {formatCalendarDate(day.date)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void handleMutation(async () => {
                                if (!selectedMoveTarget) {
                                  throw new Error('Scegli la nuova data dell\'appello');
                                }

                                await updateTeacherAppointment(appointment.id, {
                                  examDate: selectedMoveTarget.date,
                                });
                                await refreshTeacherData();
                                setSelectedDate(selectedMoveTarget.date);
                                setMoveTargetDate('');
                                requestDayDetail();
                              }, moveTargetDate
                                ? `Appello spostato a ${formatCalendarDate(moveTargetDate)}, note mantenute`
                                : 'Appello spostato, note mantenute')
                            }
                            disabled={Boolean(moveBlockReason)}
                            aria-describedby={moveBlockReason ? `appointment-move-help-${appointment.id}` : undefined}
                          >
                            Sposta appello
                          </button>
                          {moveBlockReason ? (
                            <p className="appointment-action-help" id={`appointment-move-help-${appointment.id}`}>
                              {moveBlockReason}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="compact-empty">Nessun appello in questa data.</p>
                )}
              </div>

              <label className="compact-field">
                Note appello
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Inserisci eventuali dettagli utili"
                  rows={2}
                  disabled={isSubmitting || Boolean(notesBlockReason)}
                  aria-describedby={isSubmitting || notesBlockReason ? 'appointment-action-help' : undefined}
                />
              </label>

              {actionHelp ? (
                <p id="appointment-action-help" className="appointment-action-help" aria-live="polite">
                  {actionHelp}
                </p>
              ) : null}

              {ownAppointmentOnSelectedDay ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    void handleMutation(async () => {
                      await updateTeacherAppointment(ownAppointmentOnSelectedDay.id, {
                        notes,
                      });
                      await refreshTeacherData();
                    }, 'Note dell’appello salvate')
                  }
                  disabled={isSubmitting || Boolean(primaryBlockReason)}
                  aria-describedby={actionHelp ? 'appointment-action-help' : undefined}
                >
                  Salva note
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    void handleMutation(async () => {
                      if (!selectedDate) {
                        throw new Error('Seleziona una data valida');
                      }

                      if (selectedSubjectId === '') {
                        throw new Error('Seleziona una materia valida');
                      }

                      await createTeacherAppointment({
                        subjectId: selectedSubjectId,
                        degreeProgramId: selectedDegreeProgramId,
                        examDate: selectedDate,
                        notes,
                      });
                      await refreshTeacherData();
                      setNotes('');
                    }, 'Appello inserito correttamente')
                  }
                  disabled={isSubmitting || Boolean(primaryBlockReason)}
                  aria-describedby={actionHelp ? 'appointment-action-help' : undefined}
                >
                  Inserisci appello in questa data
                </button>
              )}

              <div className="action-feedback-slot" aria-live="polite" aria-atomic="true">
                {successMessage ? (
                  <p className="alert success action-feedback">{successMessage}</p>
                ) : null}
              </div>

              <div className="own-appointments">
                <h4>I tuoi appelli</h4>
                {ownAppointments.length > 0 ? (
                  ownAppointments.map((appointment) => (
                    <button
                      type="button"
                      className={`compact-appointment ${
                        appointment.examDate === selectedDate ? 'is-current' : ''
                      }`}
                      key={appointment.id}
                      onClick={() => selectDay(appointment.examDate)}
                      title="Apri questa giornata per modificare l'appello"
                    >
                      <time dateTime={appointment.examDate}>
                        {formatCalendarDate(appointment.examDate)}
                      </time>
                      <span>{appointment.notes || 'Nessuna nota'}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Non hai ancora inserito appelli.</p>
                )}
              </div>
            </>
          ) : (
            <p className="empty-state">
              {visibleDegreePrograms.length === 0
                ? 'Il dettaglio delle giornate sarà disponibile dopo che la segreteria ti avrà assegnato un corso di laurea.'
                : !selectedDegreeProgramId
                  ? 'Seleziona un corso di laurea per vedere il dettaglio delle giornate.'
                  : 'Scegli un giorno dal calendario per vedere appelli presenti e azioni disponibili.'}
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
