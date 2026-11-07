import { useEffect, useState } from 'react';
import {createCurrentSession,fetchCurrentSessionIfExists,saveCurrentSession,} from './secretary.api';
import {defaultSessionForm,SessionFormState,} from './secretary-dashboard.types';
import { formatCalendarDate } from '../shared/format-calendar-date';

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

// Gli errori sulle festività vengono mostrati accanto al relativo campo,
// gli altri accanto al pulsante di salvataggio.
function isHolidayError(message: string) {
  return /festivit/i.test(message);
}

function isWeekendDate(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function isOutsideSession(date: string, form: SessionFormState) {
  return (
    Boolean(form.sessionStart && form.sessionEnd) &&
    (date < form.sessionStart || date > form.sessionEnd)
  );
}

// Motivo per cui la data scelta non può essere aggiunta alle festività.
function getHolidayDraftError(date: string, form: SessionFormState) {
  if (!date) {
    return undefined;
  }

  if (form.excludedHolidayDates.includes(date)) {
    return 'Questa data è già tra le festività escluse.';
  }

  if (isOutsideSession(date, form)) {
    return `La data è fuori dalla sessione esami (dal ${formatCalendarDate(
      form.sessionStart
    )} al ${formatCalendarDate(form.sessionEnd)}).`;
  }

  if (isWeekendDate(date)) {
    return 'La data cade di sabato o domenica: questi giorni sono già esclusi.';
  }

  return undefined;
}

export function SecretaryHomePage() {
  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(defaultSessionForm);
  const [holidayDraft, setHolidayDraft] = useState('');
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
        setHasCurrentSession(true);
      } else {
        setSessionForm(defaultSessionForm);
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

  function updateSessionField(
    field: Exclude<keyof SessionFormState, 'excludedHolidayDates'>,
    value: string
  ) {
    setSessionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const dateErrors = getSessionDateErrors(sessionForm);
  const holidayDraftError = getHolidayDraftError(holidayDraft, sessionForm);

  function addHoliday() {
    if (!holidayDraft || holidayDraftError) {
      return;
    }

    setSessionForm((current) => ({
      ...current,
      excludedHolidayDates: [...current.excludedHolidayDates, holidayDraft].sort(),
    }));
    setHolidayDraft('');
    setError(null);
  }

  function removeHoliday(date: string) {
    setSessionForm((current) => ({
      ...current,
      excludedHolidayDates: current.excludedHolidayDates.filter(
        (holiday) => holiday !== date
      ),
    }));
    setError(null);
  }

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
      setHasCurrentSession(true);
      setSuccessMessage(
        hasCurrentSession
          ? 'Configurazione sessione aggiornata'
          : 'Sessione esami creata'
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'il server non risponde, riprova tra qualche istante.'
      );
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

  const holidayError = error && isHolidayError(error) ? error : null;
  const saveError = error && !isHolidayError(error) ? error : null;

  return (
    <section className="session-home">
      {successMessage ? <div className="alert success" role="status">{successMessage}</div> : null}

      <div className="panel session-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Pannello segreteria</p>
            <h2>Configurazione sessione</h2>
          </div>
        </div>

        <p className="hero-copy">
          Qui si definiscono le date della sessione d'esami. I docenti vedono un
          calendario condiviso e, durante la finestra di pianificazione, fissano
          i propri appelli nei giorni ancora liberi.
        </p>

        <details className="help-box">
          <summary>Come funziona la pianificazione degli appelli</summary>
          <ol className="help-timeline" aria-label="Ordine delle date">
            <li>
              <strong>Finestra di pianificazione</strong>
              <span>i docenti inseriscono, modificano ed eliminano i propri appelli</span>
            </li>
            <li>
              <strong>Sessione esami</strong>
              <span>si svolgono gli esami nelle date fissate</span>
            </li>
          </ol>
          <ul>
            <li>
              La finestra di pianificazione deve <strong>terminare prima
              dell'inizio della sessione</strong>: fuori da questo periodo i
              docenti possono solo consultare il calendario.
            </li>
            <li>
              Per ogni <strong>corso di laurea e anno di frequenza</strong> si può
              fissare <strong>un solo appello al giorno</strong>: quando un docente
              fissa un appello, quel giorno risulta occupato anche per i colleghi
              dello stesso corso e anno, così gli studenti non hanno due esami
              nella stessa giornata.
            </li>
            <li>
              Sabati, domeniche e festività escluse non sono mai disponibili per
              gli appelli.
            </li>
          </ul>
        </details>

        <div className="session-config-grid">
          <div className="session-config-group">
            <h3>Sessione esami</h3>
            <p className="field-hint" id="session-exams-hint">
              Periodo in cui si svolgono gli esami: i docenti possono fissare
              appelli solo in queste date.
            </p>
            <div className="session-date-row">
              <label>
                Inizio sessione
                <input
                  type="date"
                  value={sessionForm.sessionStart}
                  aria-describedby="session-exams-hint"
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
                  aria-describedby="session-exams-hint"
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
            <p className="field-hint" id="session-planning-hint">
              Periodo in cui i docenti inseriscono, modificano ed eliminano i
              propri appelli. Deve terminare prima dell'inizio della sessione.
            </p>
            <div className="session-date-row">
              <label>
                Inizio pianificazione
                <input
                  type="date"
                  value={sessionForm.planningStart}
                  aria-describedby="session-planning-hint"
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
                  aria-describedby="session-planning-hint"
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

        <fieldset className="holiday-field" aria-describedby="session-holidays-hint">
          <legend>Festività escluse (opzionali)</legend>
          <p className="field-hint" id="session-holidays-hint">
            Giorni della sessione in cui non si possono fissare appelli, oltre a
            sabati e domeniche (ad esempio le festività nazionali). Scegli una
            data dal calendario e premi «Aggiungi festività».
          </p>

          <div className="holiday-picker">
            <label>
              Data da escludere
              <input
                type="date"
                value={holidayDraft}
                min={sessionForm.sessionStart || undefined}
                max={sessionForm.sessionEnd || undefined}
                aria-invalid={holidayDraftError ? true : undefined}
                aria-describedby={holidayDraftError ? 'holiday-draft-error' : undefined}
                onChange={(event) => setHolidayDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addHoliday();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="secondary"
              onClick={addHoliday}
              disabled={!holidayDraft || Boolean(holidayDraftError)}
            >
              Aggiungi festività
            </button>
          </div>

          {holidayDraftError ? (
            <p className="field-error" id="holiday-draft-error">
              {holidayDraftError}
            </p>
          ) : null}

          {holidayError ? (
            <p className="alert error field-alert" role="alert">
              {holidayError}
            </p>
          ) : null}

          {sessionForm.excludedHolidayDates.length > 0 ? (
            <ul className="holiday-list" aria-label="Festività escluse">
              {sessionForm.excludedHolidayDates.map((holiday) => (
                <li key={holiday}>
                  <time dateTime={holiday}>{formatCalendarDate(holiday)}</time>
                  {isOutsideSession(holiday, sessionForm) ? (
                    <span className="holiday-warning">fuori dalla sessione</span>
                  ) : null}
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Rimuovi ${formatCalendarDate(holiday)}`}
                    onClick={() => removeHoliday(holiday)}
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">Nessuna festività esclusa.</p>
          )}
        </fieldset>

        {saveError ? (
          <div className="alert error field-alert" role="alert">
            Configurazione non salvata: {saveError}
          </div>
        ) : null}

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
