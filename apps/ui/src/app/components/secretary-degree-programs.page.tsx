import { useEffect, useState } from 'react';
import { DegreeProgram } from '@exam-planner/shared-types';
import {
  createSecretaryDegreeProgram,
  deleteSecretaryDegreeProgram,
  fetchSecretaryDegreePrograms,
  updateSecretaryDegreeProgram,
} from './secretary.api';
import {
  defaultDegreeProgramForm,
  DegreeProgramFormState,
  DegreeProgramType,
  getDegreeProgramDuration,
  getDegreeProgramTypeLabel,
} from './secretary-dashboard.types';
import { compareText, ListToolbar, matchesSearch } from './list-toolbar';

type SecretaryDegreeProgramsPageProps = {
  onDirtyChange?: (dirty: boolean) => void;
};

export function SecretaryDegreeProgramsPage({
  onDirtyChange,
}: SecretaryDegreeProgramsPageProps) {
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([]);
  const [degreeProgramForm, setDegreeProgramForm] =
    useState<DegreeProgramFormState>(defaultDegreeProgramForm);
  const [savedDegreeProgramForm, setSavedDegreeProgramForm] =
    useState<DegreeProgramFormState>(defaultDegreeProgramForm);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programSearch, setProgramSearch] = useState('');
  const [programSort, setProgramSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDegreePrograms() {
      setLoading(true);
      setError(null);

      try {
        const loadedDegreePrograms = await fetchSecretaryDegreePrograms();
        setDegreePrograms(loadedDegreePrograms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      } finally {
        setLoading(false);
      }
    }

    void loadDegreePrograms();
  }, []);

  const isFormDirty =
    JSON.stringify(degreeProgramForm) !== JSON.stringify(savedDegreeProgramForm);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  function updateDegreeProgramFormField<K extends keyof DegreeProgramFormState>(
    field: K,
    value: DegreeProgramFormState[K]
  ) {
    setDegreeProgramForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function refreshDegreePrograms() {
    const loadedDegreePrograms = await fetchSecretaryDegreePrograms();
    setDegreePrograms(loadedDegreePrograms);
  }

  function startEditDegreeProgram(program: DegreeProgram) {
    const formFromProgram: DegreeProgramFormState = {
      code: program.code,
      name: program.name,
      type: program.durationYears === 2 ? 'magistrale' : 'triennale',
    };
    setEditingProgramId(program.id);
    setDegreeProgramForm(formFromProgram);
    setSavedDegreeProgramForm(formFromProgram);
    setError(null);
    setSuccessMessage(null);
  }

  function resetDegreeProgramForm() {
    setEditingProgramId(null);
    setDegreeProgramForm(defaultDegreeProgramForm);
    setSavedDegreeProgramForm(defaultDegreeProgramForm);
  }

  async function handleSaveDegreeProgram() {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const degreeProgramCode = degreeProgramForm.code.trim();
      const degreeProgramName = degreeProgramForm.name.trim();

      const alreadyExists = degreePrograms.some(
        (program) =>
          program.id !== editingProgramId &&
          program.code.trim().toLowerCase() === degreeProgramCode.toLowerCase() &&
          program.name.trim().toLowerCase() === degreeProgramName.toLowerCase()
      );

      if (alreadyExists) {
        throw new Error('Esiste già un corso di laurea con questo codice e questo nome');
      }

      const payload = {
        code: degreeProgramCode,
        name: degreeProgramName,
        durationYears: getDegreeProgramDuration(degreeProgramForm.type),
      };

      if (editingProgramId) {
        await updateSecretaryDegreeProgram(editingProgramId, payload);
      } else {
        await createSecretaryDegreeProgram(payload);
      }

      await refreshDegreePrograms();
      resetDegreeProgramForm();
      setSuccessMessage(
        editingProgramId ? 'Corso di laurea aggiornato' : 'Corso di laurea creato'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDegreeProgram(id: string) {
    const programToDelete = degreePrograms.find((program) => program.id === id);

    if (
      !window.confirm(
        `Vuoi eliminare il corso di laurea «${programToDelete?.name ?? ''}` +
          `${programToDelete ? ` (${programToDelete.code})` : ''}»?\n\n` +
          'Docenti, materie e appelli collegati a questo corso non potranno più usarlo. ' +
          'L’operazione non può essere annullata.'
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteSecretaryDegreeProgram(id);
      await refreshDegreePrograms();

      if (editingProgramId === id) {
        resetDegreeProgramForm();
      }

      setSuccessMessage('Corso di laurea eliminato');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  const degreeProgramDuration = getDegreeProgramDuration(degreeProgramForm.type);
  const degreeProgramPreviewYears = Array.from(
    { length: degreeProgramDuration },
    (_item, index) => index + 1
  );

  const visibleDegreePrograms = degreePrograms
    .filter((program) =>
      matchesSearch(programSearch, program.code, program.name)
    )
    .sort((first, second) =>
      programSort === 'code'
        ? compareText(first.code, second.code)
        : compareText(first.name, second.name)
    );

  if (loading) {
    return <section className="dashboard-grid secretary-layout">Caricamento corsi...</section>;
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
            void handleSaveDegreeProgram();
          }}
        >
          <div className="panel__header">
            <div>
              <p className="eyebrow">Corsi di laurea</p>
              <h2>
                {editingProgramId ? 'Modifica corso di laurea' : 'Nuovo corso di laurea'}
              </h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Codice
              <input
                value={degreeProgramForm.code}
                onChange={(event) =>
                  updateDegreeProgramFormField('code', event.target.value)
                }
                placeholder="L-8"
              />
            </label>

            <label>
              Nome
              <input
                value={degreeProgramForm.name}
                onChange={(event) =>
                  updateDegreeProgramFormField('name', event.target.value)
                }
                placeholder="Ingegneria Elettronica"
              />
            </label>

            <label>
              Tipo corso
              <select
                value={degreeProgramForm.type}
                onChange={(event) =>
                  updateDegreeProgramFormField(
                    'type',
                    event.target.value as DegreeProgramType
                  )
                }
              >
                <option value="triennale">Laurea triennale</option>
                <option value="magistrale">Laurea magistrale</option>
              </select>
            </label>
          </div>

          <div className="panel-section">
            <h3>Anni previsti</h3>
            <div className="summary-row">
              <span>
                {degreeProgramForm.type === 'triennale'
                  ? 'Laurea triennale'
                  : 'Laurea magistrale'}
              </span>
              <span>{degreeProgramDuration} anni</span>
            </div>
            <div className="summary-row">
              <span>Anni disponibili</span>
              <span>
                {degreeProgramPreviewYears
                  .map((year) => `${year}° anno`)
                  .join(', ')}
              </span>
            </div>
          </div>

          {editingProgramId &&
          savedDegreeProgramForm.type !== degreeProgramForm.type ? (
            <p className="field-hint" role="note">
              Cambiando il tipo di corso cambiano gli anni disponibili: verifica
              le materie e gli appelli già associati agli anni non più previsti.
            </p>
          ) : null}

          <div className="inline-actions">
            <button
              type="submit"
              className="primary"
              disabled={isSubmitting}
            >
              {editingProgramId ? 'Salva modifiche' : 'Aggiungi corso di laurea'}
            </button>
            {editingProgramId ? (
              <button
                type="button"
                className="secondary"
                onClick={resetDegreeProgramForm}
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
              <p className="eyebrow">Corsi di laurea</p>
              <h2>Elenco corsi</h2>
            </div>
          </div>

          <ListToolbar
            search={programSearch}
            onSearchChange={setProgramSearch}
            searchPlaceholder="Codice o nome"
            sort={programSort}
            onSortChange={setProgramSort}
            sortOptions={[
              { value: 'name', label: 'Nome' },
              { value: 'code', label: 'Codice' },
            ]}
          />

          <div className="panel-section">
            {degreePrograms.length === 0 ? (
              <p className="empty-state">
                Nessun corso di laurea inserito. Usa il modulo «Nuovo corso di laurea»
                per aggiungerne uno.
              </p>
            ) : null}
            {degreePrograms.length > 0 && visibleDegreePrograms.length === 0 ? (
              <p className="empty-state">Nessun corso corrisponde alla ricerca.</p>
            ) : null}
            {visibleDegreePrograms.map((program) => (
              <div className="summary-row list-row" key={program.id}>
                <span>{program.code}</span>
                <span>
                  {program.name}
                  <br />
                  {getDegreeProgramTypeLabel(program)}
                </span>
                <span className="inline-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => startEditDegreeProgram(program)}
                    disabled={isSubmitting}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void handleDeleteDegreeProgram(program.id)}
                    disabled={isSubmitting}
                  >
                    Elimina
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
