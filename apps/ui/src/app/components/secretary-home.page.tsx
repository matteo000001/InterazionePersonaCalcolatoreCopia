import { useEffect, useState } from 'react';
import {createCurrentSession,fetchCurrentSessionIfExists,saveCurrentSession,} from './secretary.api';
import {defaultSessionForm,SessionFormState,} from './secretary-dashboard.types';

// Sposta una data AAAA-MM-GG di `amount` giorni (stringa vuota se la data manca).
function shiftDate(date: string, amount: number) {
  if (!date) {
    return '';
  }

  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

function getSessionDateErrors(form: SessionFormState) {
  const errors: string[] = [];

  if (form.sessionStart && form.sessionEnd && form.sessionEnd < form.sessionStart) {
    errors.push('La fine della sessione deve essere uguale o successiva all\'inizio.');
  }

  if (form.planningStart && form.planningEnd && form.planningEnd < form.planningStart) {
    errors.push(
      'La fine della pianificazione deve essere uguale o successiva all\'inizio.'
    );
  }

  if (form.planningEnd && form.sessionStart && form.planningEnd >= form.sessionStart) {
    errors.push(
      'La finestra di pianificazione deve terminare prima dell\'inizio della sessione esami.'
    );
  }

  return errors;
}

export function SecretaryHomePage() {
  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(defaultSessionForm);
  const [holidayInput, setHolidayInput] = useState('');
  const [hasCurrentSession, setHasCurrentSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadCurrentSession() {
    setLoading(true);
    setLoadError(null);
    setError(null);

    try {
      const currentSession = await fetchCurrentSessionIfExists();

      if (currentSession) {
        setSessionForm({
          sessionStart: currentSession.sessionStart,
          sessionEnd: currentSession.sessionEnd,
          planningStart: currentSession.planningStart,
          planningEnd: currentSession.planningEnd,
          excludedHolidayDates: currentSession.excludedHolidayDates,
        });
        setHolidayInput(currentSession.excludedHolidayDates.join(', '));
        setHasCurrentSession(true);
      } else {
        setSessionForm(defaultSessionForm);
        setHolidayInput('');
        setHasCurrentSession(false);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'Il server non risponde'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCurrentSession();
  }, []);

  function updateSessionField(field: keyof SessionFormState, value: string) {
    setSessionForm((current) => ({
      ...current,
      [field]:
        field === 'excludedHolidayDates'
          ? value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : value,
    }));
  }

  const dateErrors = getSessionDateErrors(sessionForm);

  async function handleSaveSession() {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedSession = hasCurrentSession
        ? await saveCurrentSession(sessionForm)
        : await createCurrentSession(sessionForm);

      setSessionForm({
        sessionStart: updatedSession.sessionStart,
        sessionEnd: updatedSession.sessionEnd,
        planningStart: updatedSession.planningStart,
        planningEnd: updatedSession.planningEnd,
        excludedHolidayDates: updatedSession.excludedHolidayDates,
      });
      setHolidayInput(updatedSession.excludedHolidayDates.join(', '));
      setHasCurrentSession(true);
      setSuccessMessage(
        hasCurrentSession
          ? 'Configurazione sessione aggiornata'
          : 'Sessione esami creata'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <section className="session-home">Caricamento sessione...</section>;
  }

  if (loadError) {
    return (
      <section className="session-home">
        <div className="panel session-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Pannello segreteria</p>
              <h2>Configurazione sessione</h2>
            </div>
          </div>
          <div className="alert error" role="alert">
            Non è stato possibile leggere la configurazione della sessione corrente
            ({loadError}). La configurazione salvata non è stata cancellata: riprova
            prima di modificarla o di crearne una nuova.
          </div>
          <button
            type="button"
            className="primary session-save"
            onClick={() => void loadCurrentSession()}
          >
            Riprova
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="session-home">
      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {successMessage ? <div className="alert success" role="status">{successMessage}</div> : null}

      <div className="panel session-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Pannello segreteria</p>
            <h2>Configurazione sessione</h2>
          </div>
        </div>

        <p className="hero-copy">
          La finestra di pianificazione, in cui i docenti inseriscono gli appelli,
          deve terminare prima dell'inizio della sessione esami.
        </p>

        <div className="session-config-grid">
          <div className="session-config-group">
            <h3>Sessione esami</h3>
            <div className="session-date-row">
              <label>
                Inizio sessione
                <input
                  type="date"
                  value={sessionForm.sessionStart}
                  min={shiftDate(sessionForm.planningEnd, 1) || undefined}
                  max={sessionForm.sessionEnd || undefined}
                  onChange={(event) =>
                    updateSessionField('sessionStart', event.target.value)
                  }
                />
              </label>

              <label>
                Fine sessione
                <input
                  type="date"
                  value={sessionForm.sessionEnd}
                  min={sessionForm.sessionStart || undefined}
                  onChange={(event) =>
                    updateSessionField('sessionEnd', event.target.value)
                  }
                />
              </label>
            </div>
          </div>

          <div className="session-config-group">
            <h3>Finestra pianificazione</h3>
            <div className="session-date-row">
              <label>
                Inizio pianificazione
                <input
                  type="date"
                  value={sessionForm.planningStart}
                  max={sessionForm.planningEnd || undefined}
                  onChange={(event) =>
                    updateSessionField('planningStart', event.target.value)
                  }
                />
              </label>

              <label>
                Fine pianificazione
                <input
                  type="date"
                  value={sessionForm.planningEnd}
                  min={sessionForm.planningStart || undefined}
                  max={shiftDate(sessionForm.sessionStart, -1) || undefined}
                  onChange={(event) =>
                    updateSessionField('planningEnd', event.target.value)
                  }
                />
              </label>
            </div>
          </div>
        </div>

        {dateErrors.length > 0 ? (
          <ul className="alert error field-errors" role="alert">
            {dateErrors.map((dateError) => (
              <li key={dateError}>{dateError}</li>
            ))}
          </ul>
        ) : null}

        <label className="holiday-field">
          Festività escluse (opzionali)
          <input
            type="text"
            value={holidayInput}
            onChange={(event) => {
              setHolidayInput(event.target.value);
              updateSessionField('excludedHolidayDates', event.target.value);
            }}
            placeholder="2026-04-25, 2026-05-01"
          />
        </label>

        <button
          type="button"
          className="primary session-save"
          onClick={() => void handleSaveSession()}
          disabled={isSubmitting || dateErrors.length > 0}
        >
          {hasCurrentSession
            ? 'Salva configurazione sessione'
            : 'Crea sessione esami'}
        </button>
      </div>
    </section>
  );
}
