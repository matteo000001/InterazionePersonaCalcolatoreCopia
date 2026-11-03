import { useEffect, useState } from 'react';
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

export function TeacherDashboard() {
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

  const visibleDegreePrograms =
    user?.managedDegreeProgramIds && user.managedDegreeProgramIds.length > 0
      ? degreePrograms.filter((program) =>
          user.managedDegreeProgramIds?.includes(program.id)
        )
      : [];
  const selectedCourseYear = courseYears.find(
    (year) => year.id === selectedCourseYearId
  );
  const selectedDay = availability.find((day) => day.date === selectedDate);
  const ownAppointmentOnSelectedDay = selectedDay?.appointments.find(
    (appointment) => appointment.teacherId === user?.id
  );
  const ownAppointments = user
    ? appointments.filter((appointment) => appointment.teacherId === user.id)
    : [];
  const moveTargetDays = availability.filter((day) => day.isSelectable);

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
      return;
    }

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
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      }
    }

    void loadTeacherData();
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

    if (subjectId === '') {
      return;
    }

    const subject = subjects.find((currentSubject) => currentSubject.id === subjectId);

    if (!subject) {
      return;
    }

    setSelectedCourseYearId(subject.courseYearId);
  }

  function selectDegreeProgram(degreeProgramId: string) {
    setSelectedDegreeProgramId(degreeProgramId);
    setSelectedSubjectId('');
    setNotes('');
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
          <h2>Il calendario non puo essere costruito</h2>
          <p className="hero-copy">
            Verifica che esistano una sessione corrente, almeno un corso di laurea
            e almeno un anno di corso.
          </p>
          <div className="alert error">
            {error ?? 'Dati di calendario mancanti nel database'}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-card">
          <div className="summary-row">
            <span>Utente</span>
            <strong>{user.name}</strong>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/logout')}
          >
            Esci
          </button>

          <div className="summary-row">
            <span>Documentazione API</span>
            <a href="http://localhost:3333/api/docs" target="_blank" rel="noreferrer">
              http://localhost:3333/api/docs
            </a>
          </div>
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {successMessage ? <div className="alert success">{successMessage}</div> : null}

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Pannello docente</p>
              <h2>{user.name}</h2>
            </div>
            <div className="session-badge">
              Pianificazione: {session.planningStart} - {session.planningEnd}
            </div>
          </div>

          <div className="filters">
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
              <span className="readonly-value">
                {selectedCourseYear
                  ? `${selectedCourseYear.year} anno`
                  : selectedCourseYearId}
              </span>
            </label>

            <label>
              Materia
              <select
                value={selectedSubjectId}
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

          <div className="legend">
            <span className="legend-pill available">Libero</span>
            <span className="legend-pill occupied">Occupato</span>
            <span className="legend-pill weekend">Fine settimana</span>
            <span className="legend-pill holiday">Festivita</span>
            <span className="legend-pill blocked">Finestra chiusa</span>
          </div>

          <AvailabilityCalendar
            days={availability}
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setMoveTargetDate('');
              const ownAppointment =
                availability
                  .find((day) => day.date === date)
                  ?.appointments.find((appointment) => appointment.teacherId === user.id) ??
                appointments.find((appointment) => appointment.teacherId === user.id);
              setNotes(ownAppointment?.notes ?? '');
            }}
          />
        </div>

        <aside className="panel side-panel">
          <div className="day-detail-header">
            <div>
              <p className="eyebrow">Dettaglio giornata</p>
              <h3>{selectedDate ?? 'Seleziona una data'}</h3>
            </div>
            {selectedDay ? (
              <span className={`status-label status-${selectedDay.status}`}>
                {selectedDay.reason ?? 'Data disponibile'}
              </span>
            ) : null}
          </div>

          {selectedDay ? (
            <>
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
                            className="secondary"
                            onClick={() =>
                              void handleMutation(async () => {
                                await updateTeacherAppointment(appointment.id, {
                                  subjectId: selectedSubjectId || appointment.subjectId,
                                  degreeProgramId: selectedDegreeProgramId,
                                  examDate: selectedDate,
                                  notes,
                                });
                                await refreshTeacherData();
                              }, 'Appello aggiornato')
                            }
                            disabled={isSubmitting}
                          >
                            Salva note
                          </button>
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
                            disabled={isSubmitting}
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
                              disabled={isSubmitting || moveTargetDays.length === 0}
                            >
                              <option value="">
                                {moveTargetDays.length > 0
                                  ? 'Scegli una data libera'
                                  : 'Nessuna data libera disponibile'}
                              </option>
                              {moveTargetDays.map((day) => (
                                <option key={day.date} value={day.date}>
                                  {day.date}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void handleMutation(async () => {
                                if (!moveTargetDate) {
                                  throw new Error('Scegli la nuova data dell\'appello');
                                }

                                await updateTeacherAppointment(appointment.id, {
                                  examDate: moveTargetDate,
                                });
                                await refreshTeacherData();
                                setSelectedDate(moveTargetDate);
                                setMoveTargetDate('');
                              }, `Appello spostato al ${moveTargetDate}, note mantenute`)
                            }
                            disabled={isSubmitting || !moveTargetDate}
                          >
                            Sposta appello
                          </button>
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
                />
              </label>

              {ownAppointmentOnSelectedDay ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    void handleMutation(async () => {
                      if (selectedSubjectId === '') {
                        throw new Error('Seleziona una materia valida');
                      }

                      await updateTeacherAppointment(ownAppointmentOnSelectedDay.id, {
                        subjectId: selectedSubjectId,
                        degreeProgramId: selectedDegreeProgramId,
                        examDate: selectedDate,
                        notes,
                      });
                      await refreshTeacherData();
                    }, 'Appello aggiornato')
                  }
                  disabled={isSubmitting}
                >
                  Aggiorna il tuo appello
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
                  disabled={
                    isSubmitting ||
                    !selectedDay.isSelectable ||
                    selectedSubjectId === ''
                  }
                >
                  Inserisci appello in questa data
                </button>
              )}

              <div className="own-appointments">
                <h4>I tuoi appelli</h4>
                {ownAppointments.length > 0 ? (
                  ownAppointments.map((appointment) => (
                    <div className="compact-appointment" key={appointment.id}>
                      <span>{appointment.examDate}</span>
                      <span>{appointment.notes || 'Nessuna nota'}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Non hai ancora inserito appelli.</p>
                )}
              </div>
            </>
          ) : (
            <p className="empty-state">
              Scegli un giorno dal calendario per vedere appelli presenti e azioni
              disponibili.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
