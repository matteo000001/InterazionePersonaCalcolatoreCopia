import { useEffect, useState } from 'react';
import {
  CourseYear,
  DegreeProgram,
  Subject,
  User,
  UserRole,
} from '@exam-planner/shared-types';
import {
  createSecretarySubject,
  deleteSecretarySubject,
  fetchSecretaryCourseYears,
  fetchSecretaryDegreePrograms,
  fetchSecretarySubjects,
  fetchSecretaryUsers,
  updateSecretarySubject,
} from './secretary.api';
import {
  defaultSubjectForm,
  getCourseYearLabel,
  getDegreeProgramNames,
  getSubjectMaxCourseYear,
  SubjectFormState,
} from './secretary-dashboard.types';
import { compareText, ListToolbar, matchesSearch } from './list-toolbar';
import { CheckboxGroup } from './checkbox-group';

type SecretarySubjectsPageProps = {
  onDirtyChange?: (dirty: boolean) => void;
};

export function SecretarySubjectsPage({
  onDirtyChange,
}: SecretarySubjectsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([]);
  const [courseYears, setCourseYears] = useState<CourseYear[]>([]);
  const [subjectForm, setSubjectForm] =
    useState<SubjectFormState>(defaultSubjectForm);
  const [savedSubjectForm, setSavedSubjectForm] =
    useState<SubjectFormState>(defaultSubjectForm);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectProgramFilter, setSubjectProgramFilter] = useState('');
  const [subjectSort, setSubjectSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubjectsPage() {
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

    void loadSubjectsPage();
  }, []);

  const isFormDirty =
    JSON.stringify(subjectForm) !== JSON.stringify(savedSubjectForm);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  function updateSubjectFormField<K extends keyof SubjectFormState>(
    field: K,
    value: SubjectFormState[K]
  ) {
    setSubjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectSubjectDegreePrograms(selectedIds: string[]) {
    updateSubjectFormField('degreeProgramIds', selectedIds);

    const selectedCourseYear = courseYears.find(
      (year) => year.id === subjectForm.courseYearId
    );
    const maxSelectedCourseYear = getSubjectMaxCourseYear(
      selectedIds,
      courseYears,
      degreePrograms
    );

    if (
      selectedCourseYear &&
      maxSelectedCourseYear !== undefined &&
      selectedCourseYear.year > maxSelectedCourseYear
    ) {
      updateSubjectFormField('courseYearId', '');
    }
  }

  async function refreshSubjects() {
    const loadedSubjects = await fetchSecretarySubjects();
    setSubjects(loadedSubjects);
  }

  function startEditSubject(selectedSubject: Subject) {
    const formFromSubject: SubjectFormState = {
      name: selectedSubject.name,
      teacherId: selectedSubject.teacherId,
      degreeProgramIds: selectedSubject.degreeProgramIds ?? [],
      courseYearId: selectedSubject.courseYearId,
    };
    setEditingSubjectId(selectedSubject.id);
    setSubjectForm(formFromSubject);
    setSavedSubjectForm(formFromSubject);
  }

  function resetSubjectForm() {
    setEditingSubjectId(null);
    setSubjectForm(defaultSubjectForm);
    setSavedSubjectForm(defaultSubjectForm);
  }

  async function handleSaveSubject() {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (subjectForm.teacherId === '') {
        throw new Error('Seleziona un docente valido');
      }

      const payload = {
        name: subjectForm.name,
        teacherId: subjectForm.teacherId,
        degreeProgramIds: subjectForm.degreeProgramIds,
        courseYearId: subjectForm.courseYearId,
      };

      if (editingSubjectId) {
        await updateSecretarySubject(editingSubjectId, payload);
        setSuccessMessage('Materia aggiornata');
      } else {
        await createSecretarySubject(payload);
        setSuccessMessage('Materia creata');
      }

      await refreshSubjects();
      resetSubjectForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSubject(id: number) {
    const subjectToDelete = subjects.find((subject) => subject.id === id);
    const teacherName = subjectToDelete
      ? users.find((currentUser) => currentUser.id === subjectToDelete.teacherId)?.name
      : undefined;

    if (
      !window.confirm(
        `Vuoi eliminare la materia «${subjectToDelete?.name ?? ''}»` +
          `${teacherName ? ` di ${teacherName}` : ''}?\n\n` +
          'Gli appelli già fissati per questa materia potrebbero non essere più consultabili. ' +
          'L’operazione non può essere annullata.'
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteSecretarySubject(id);
      await refreshSubjects();

      if (editingSubjectId === id) {
        resetSubjectForm();
      }

      setSuccessMessage('Materia eliminata');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  const teacherUsers = users.filter(
    (currentUser) => currentUser.role === UserRole.TEACHER
  );
  const selectedSubjectTeacher = teacherUsers.find(
    (currentUser) => currentUser.id === subjectForm.teacherId
  );
  const subjectDegreeProgramOptions = selectedSubjectTeacher
    ? degreePrograms.filter((program) =>
        selectedSubjectTeacher.managedDegreeProgramIds?.includes(program.id)
      )
    : degreePrograms;
  const selectedTeacherHasNoPrograms =
    Boolean(selectedSubjectTeacher) && subjectDegreeProgramOptions.length === 0;
  const subjectMaxCourseYear = getSubjectMaxCourseYear(
    subjectForm.degreeProgramIds,
    courseYears,
    degreePrograms
  );
  const subjectCourseYearOptions =
    subjectMaxCourseYear === undefined
      ? []
      : courseYears.filter((year) => year.year <= subjectMaxCourseYear);

  const teacherNameOf = (teacherId: number) =>
    users.find((currentUser) => currentUser.id === teacherId)?.name ?? '';
  const visibleSubjects = subjects
    .filter(
      (subject) =>
        (subjectProgramFilter === '' ||
          subject.degreeProgramIds.includes(subjectProgramFilter)) &&
        matchesSearch(subjectSearch, subject.name, teacherNameOf(subject.teacherId))
    )
    .sort((first, second) =>
      subjectSort === 'teacher'
        ? compareText(teacherNameOf(first.teacherId), teacherNameOf(second.teacherId)) ||
          compareText(first.name, second.name)
        : compareText(first.name, second.name)
    );

  if (loading) {
    return <section className="dashboard-grid secretary-layout">Caricamento materie...</section>;
  }

  return (
    <>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {successMessage ? <div className="alert success" role="status">{successMessage}</div> : null}

      <section className="dashboard-grid secretary-layout">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveSubject();
          }}
        >
          <div className="panel__header">
            <div>
              <p className="eyebrow">Materie</p>
              <h2>{editingSubjectId ? 'Modifica materia' : 'Nuova materia'}</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Nome
              <input
                value={subjectForm.name}
                onChange={(event) =>
                  updateSubjectFormField('name', event.target.value)
                }
                placeholder="Analisi 2"
              />
            </label>

            <label>
              Docente
              <select
                value={subjectForm.teacherId}
                onChange={(event) => {
                  const teacherId = event.target.value
                    ? Number(event.target.value)
                    : '';
                  updateSubjectFormField('teacherId', teacherId);
                  updateSubjectFormField('degreeProgramIds', []);
                }}
              >
                <option value="">Seleziona docente</option>
                {teacherUsers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedTeacherHasNoPrograms ? (
            <div className="alert error" role="alert">
              {selectedSubjectTeacher?.name} non ha corsi di laurea assegnati, quindi
              non è possibile associargli una materia. Assegna prima i corsi al
              docente nella sezione «Utenti» (Modifica &gt; Corsi gestiti).
            </div>
          ) : null}

          <CheckboxGroup
            legend="Corsi di laurea"
            hint={
              selectedSubjectTeacher
                ? `Seleziona uno o più corsi di laurea in cui è insegnata la materia (tra quelli gestiti da ${selectedSubjectTeacher.name}).`
                : 'Seleziona uno o più corsi di laurea in cui è insegnata la materia.'
            }
            emptyMessage={
              selectedTeacherHasNoPrograms
                ? 'Il docente scelto non ha corsi di laurea assegnati.'
                : 'Non ci sono ancora corsi di laurea: creali nella sezione «Corsi di laurea».'
            }
            options={subjectDegreeProgramOptions.map((program) => ({
              value: program.id,
              label: `${program.code} - ${program.name}`,
            }))}
            selectedValues={subjectForm.degreeProgramIds}
            onChange={selectSubjectDegreePrograms}
          />

          <label>
            Anno di frequenza
            <select
              value={subjectForm.courseYearId}
              disabled={subjectForm.degreeProgramIds.length === 0}
              onChange={(event) =>
                updateSubjectFormField('courseYearId', event.target.value)
              }
            >
              <option value="">
                {subjectForm.degreeProgramIds.length === 0
                  ? 'Seleziona prima il corso'
                  : 'Seleziona anno'}
              </option>
              {subjectCourseYearOptions.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year}° anno
                </option>
              ))}
            </select>
          </label>

          <div className="inline-actions">
            <button
              type="submit"
              className="primary"
              disabled={isSubmitting || selectedTeacherHasNoPrograms}
            >
              {editingSubjectId ? 'Salva modifiche' : 'Aggiungi materia'}
            </button>
            {editingSubjectId ? (
              <button
                type="button"
                className="secondary"
                onClick={resetSubjectForm}
                disabled={isSubmitting}
              >
                Annulla
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Materie</p>
              <h2>Elenco materie</h2>
            </div>
          </div>

          <ListToolbar
            search={subjectSearch}
            onSearchChange={setSubjectSearch}
            searchPlaceholder="Materia o docente"
            sort={subjectSort}
            onSortChange={setSubjectSort}
            sortOptions={[
              { value: 'name', label: 'Nome materia' },
              { value: 'teacher', label: 'Docente' },
            ]}
          >
            <label>
              Corso di laurea
              <select
                value={subjectProgramFilter}
                onChange={(event) => setSubjectProgramFilter(event.target.value)}
              >
                <option value="">Tutti i corsi</option>
                {degreePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </label>
          </ListToolbar>

          <div className="panel-section">
            {subjects.length === 0 ? (
              <p className="empty-state">
                Nessuna materia inserita. Usa il modulo «Nuova materia» per
                aggiungerne una.
              </p>
            ) : null}
            {subjects.length > 0 && visibleSubjects.length === 0 ? (
              <p className="empty-state">Nessuna materia corrisponde ai filtri.</p>
            ) : null}
            {visibleSubjects.map((subject) => {
              const teacher = users.find(
                (currentUser) => currentUser.id === subject.teacherId
              );
              const subjectPrograms = getDegreeProgramNames(
                subject.degreeProgramIds,
                degreePrograms
              );

              return (
                <div className="summary-row list-row" key={subject.id}>
                  <span>
                    {subject.name}
                    <br />
                    {teacher?.name ?? 'Materia scoperta'}
                  </span>
                  <span>
                    {subjectPrograms || 'Nessun corso di laurea'}
                    <br />
                    {getCourseYearLabel(subject.courseYearId, courseYears)}
                  </span>
                  <span className="inline-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => startEditSubject(subject)}
                      disabled={isSubmitting}
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void handleDeleteSubject(subject.id)}
                      disabled={isSubmitting}
                    >
                      Elimina
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
