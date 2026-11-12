import { useEffect, useState } from 'react';
import {
  CourseYear,
  DegreeProgram,
  ExamAppointment,
  Subject,
  User,
  UserRole,
} from '@exam-planner/shared-types';
import {
  fetchSecretaryAppointments,
  fetchSecretaryCourseYears,
  fetchSecretaryDegreePrograms,
  fetchSecretarySubjects,
  fetchSecretaryUsers,
} from './secretary.api';
import {
  AppointmentSearchState,
  defaultAppointmentSearch,
  getCourseYearLabel,
  getDegreeProgramNames,
  getSubjectMaxCourseYear,
} from './secretary-dashboard.types';

export function SecretaryAppointmentsSearchPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([]);
  const [courseYears, setCourseYears] = useState<CourseYear[]>([]);
  const [appointmentSearch, setAppointmentSearch] =
    useState<AppointmentSearchState>(defaultAppointmentSearch);
  const [appointmentResults, setAppointmentResults] = useState<
    ExamAppointment[]
  >([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAppointmentsPage() {
      setLoading(true);
      setError(null);

      try {
        const [
          loadedUsers,
          loadedSubjects,
          loadedDegreePrograms,
          loadedCourseYears,
        ] = await Promise.all([
          fetchSecretaryUsers(),
          fetchSecretarySubjects(),
          fetchSecretaryDegreePrograms(),
          fetchSecretaryCourseYears(),
        ]);
        setUsers(loadedUsers);
        setSubjects(loadedSubjects);
        setDegreePrograms(loadedDegreePrograms);
        setCourseYears(loadedCourseYears);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      } finally {
        setLoading(false);
      }
    }

    void loadAppointmentsPage();
  }, []);

  function updateAppointmentSearchField<K extends keyof AppointmentSearchState>(
    field: K,
    value: AppointmentSearchState[K]
  ) {
    const isDegreeProgramFilter = field === 'degreeProgramId';
    const isPrimaryFilter = isDegreeProgramFilter || field === 'courseYearId';

    setAppointmentSearch((current) => ({
      ...current,
      [field]: value,
      ...(isDegreeProgramFilter ? { courseYearId: '' } : {}),
      ...(isPrimaryFilter ? { subjectId: '' as const } : {}),
      ...(isPrimaryFilter ? { teacherId: '' as const } : {}),
      ...(field === 'teacherId' ? { subjectId: '' as const } : {}),
    }));

    // Qualsiasi cambio di filtro rende vecchi i risultati mostrati.
    setAppointmentResults([]);
    setHasSearched(false);
  }

  async function handleSearchAppointments() {
    setIsSubmitting(true);
    setError(null);

    try {
      const loadedAppointments = await fetchSecretaryAppointments({
        degreeProgramId: appointmentSearch.degreeProgramId,
        courseYearId: appointmentSearch.courseYearId,
      });
      const filteredAppointments = loadedAppointments.filter((appointment) => {
        const teacherMatches =
          appointmentSearch.teacherId === '' ||
          appointment.teacherId === appointmentSearch.teacherId;
        const subjectMatches =
          appointmentSearch.subjectId === '' ||
          appointment.subjectId === appointmentSearch.subjectId;

        return teacherMatches && subjectMatches;
      });

      setAppointmentResults(filteredAppointments);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ricerca non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  const teacherUsers = users.filter(
    (currentUser) => currentUser.role === UserRole.TEACHER
  );
  const appointmentSubjectOptions = subjects.filter((subject) => {
    const degreeProgramMatches =
      !appointmentSearch.degreeProgramId ||
      subject.degreeProgramIds.includes(appointmentSearch.degreeProgramId);
    const courseYearMatches =
      !appointmentSearch.courseYearId ||
      subject.courseYearId === appointmentSearch.courseYearId;
    const teacherMatches =
      appointmentSearch.teacherId === '' ||
      subject.teacherId === appointmentSearch.teacherId;

    return degreeProgramMatches && courseYearMatches && teacherMatches;
  });
  const appointmentMaxCourseYear = appointmentSearch.degreeProgramId
    ? getSubjectMaxCourseYear(
        [appointmentSearch.degreeProgramId],
        courseYears,
        degreePrograms
      )
    : undefined;
  const appointmentCourseYearOptions =
    appointmentMaxCourseYear === undefined
      ? []
      : courseYears.filter((year) => year.year <= appointmentMaxCourseYear);
  const appointmentTeacherIds = new Set(
    subjects
      .filter(
        (subject) =>
          subject.degreeProgramIds.includes(appointmentSearch.degreeProgramId) &&
          subject.courseYearId === appointmentSearch.courseYearId
      )
      .map((subject) => subject.teacherId)
  );
  const canSelectAppointmentOptionalFilters =
    Boolean(appointmentSearch.degreeProgramId) &&
    Boolean(appointmentSearch.courseYearId);
  const appointmentTeacherOptions = canSelectAppointmentOptionalFilters
    ? teacherUsers.filter((teacher) => appointmentTeacherIds.has(teacher.id))
    : teacherUsers;

  if (loading) {
    return <section className="dashboard-grid secretary-layout">Caricamento appelli...</section>;
  }

  return (
    <>
      {error ? <div className="alert error" role="alert">{error}</div> : null}

      <section className="dashboard-grid secretary-layout">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearchAppointments();
          }}
        >
          <div className="panel__header">
            <div>
              <p className="eyebrow">Appelli</p>
              <h2>Ricerca appelli</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Corso di laurea
              <select
                value={appointmentSearch.degreeProgramId}
                onChange={(event) =>
                  updateAppointmentSearchField(
                    'degreeProgramId',
                    event.target.value
                  )
                }
              >
                <option value="">Seleziona corso</option>
                {degreePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Anno di frequenza
              <select
                value={appointmentSearch.courseYearId}
                disabled={!appointmentSearch.degreeProgramId}
                onChange={(event) =>
                  updateAppointmentSearchField('courseYearId', event.target.value)
                }
              >
                <option value="">
                  {appointmentSearch.degreeProgramId
                    ? 'Seleziona anno'
                    : 'Seleziona prima il corso'}
                </option>
                {appointmentCourseYearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}° anno
                  </option>
                ))}
              </select>
            </label>

            <label>
              Docente
              <select
                value={appointmentSearch.teacherId}
                onChange={(event) =>
                  updateAppointmentSearchField(
                    'teacherId',
                    event.target.value ? Number(event.target.value) : ''
                  )
                }
              >
                <option value="">Tutti i docenti</option>
                {appointmentTeacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Materia
              <select
                value={appointmentSearch.subjectId}
                onChange={(event) =>
                  updateAppointmentSearchField(
                    'subjectId',
                    event.target.value ? Number(event.target.value) : ''
                  )
                }
              >
                <option value="">Tutte le materie</option>
                {appointmentSubjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button type="submit" className="primary" disabled={isSubmitting}>
            Avvia ricerca
          </button>
        </form>

        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Appelli</p>
              <h2>Risultati ricerca</h2>
            </div>
          </div>

          <div className="panel-section">
            {appointmentResults.length > 0 ? (
              appointmentResults.map((appointment) => {
                const teacher = users.find(
                  (currentUser) => currentUser.id === appointment.teacherId
                );
                const subject =
                  appointment.subject ??
                  subjects.find(
                    (currentSubject) =>
                      currentSubject.id === appointment.subjectId
                  );

                return (
                  <div className="summary-row list-row list-row--no-actions" key={appointment.id}>
                    <span>
                      {appointment.examDate}
                      <br />
                      {teacher?.name ?? 'Docente non più presente'}
                    </span>
                    <span>
                      {subject?.name ?? 'Materia non più presente'}
                      <br />
                      {getDegreeProgramNames([appointment.degreeProgramId], degreePrograms)}
                      {' – '}
                      {getCourseYearLabel(appointment.courseYearId, courseYears)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="empty-state">
                {hasSearched
                  ? 'Nessun appello trovato per la ricerca selezionata.'
                  : 'Imposta i filtri e premi «Avvia ricerca» per vedere gli appelli.'}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
