import { useEffect, useState } from 'react';
import { DegreeProgram, User, UserRole } from '@exam-planner/shared-types';
import {
  createSecretaryUser,
  deleteSecretaryUser,
  fetchSecretaryDegreePrograms,
  fetchSecretaryUsers,
  updateSecretaryUser,
} from './secretary.api';
import {
  defaultUserForm,
  getDegreeProgramNames,
  getUserRoleLabel,
  UserFormState,
} from './secretary-dashboard.types';
import { compareText, ListToolbar, matchesSearch } from './list-toolbar';
import { CheckboxGroup } from './checkbox-group';

type UserFormField = 'name' | 'email' | 'password';
type UserFormErrors = Partial<Record<UserFormField, string>>;

const passwordRequirements = [
  {
    description: 'almeno 8 caratteri',
    isSatisfied: (value: string) => Array.from(value).length >= 8,
  },
  {
    description: 'una lettera maiuscola da A a Z',
    isSatisfied: (value: string) => /[A-Z]/.test(value),
  },
  {
    description: 'un carattere speciale tra ?^!@#',
    isSatisfied: (value: string) => /[?^!@#]/.test(value),
  },
];

// Controlla il modulo prima dell'invio, così ogni errore è mostrato in
// italiano sotto il campo a cui si riferisce.
function getUserFormErrors(form: UserFormState, isEditing: boolean): UserFormErrors {
  const errors: UserFormErrors = {};
  const name = form.name.trim();
  const email = form.email.trim();

  if (!name) {
    errors.name = 'Inserisci il nome e il cognome.';
  } else if (name.length < 3) {
    errors.name = 'Il nome deve contenere almeno 3 caratteri.';
  }

  if (!email) {
    errors.email = "Inserisci l'e-mail.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Inserisci un'e-mail valida, ad esempio nome.cognome@ateneo.it.";
  }

  if (!isEditing) {
    const missingRequirements = passwordRequirements.filter(
      (requirement) => !requirement.isSatisfied(form.password)
    );

    if (!form.password) {
      errors.password = 'Inserisci una password.';
    } else if (missingRequirements.length > 0) {
      errors.password = `La password deve contenere ${missingRequirements
        .map((requirement) => requirement.description)
        .join(', ')}.`;
    }
  }

  return errors;
}

// Gli errori del server che riguardano un campo vengono mostrati sotto quel campo.
function getServerFieldError(message: string): UserFormField | undefined {
  if (/e-mail/i.test(message)) {
    return 'email';
  }

  if (/password/i.test(message)) {
    return 'password';
  }

  if (/nome/i.test(message)) {
    return 'name';
  }

  return undefined;
}

type SecretaryUsersPageProps = {
  currentUserId?: number;
  onDirtyChange?: (dirty: boolean) => void;
};

export function SecretaryUsersPage({
  currentUserId,
  onDirtyChange,
}: SecretaryUsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([]);
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm);
  const [savedUserForm, setSavedUserForm] =
    useState<UserFormState>(defaultUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | ''>('');
  const [userSort, setUserSort] = useState('name-asc');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<UserFormErrors>({});

  useEffect(() => {
    async function loadUsersPage() {
      setLoading(true);
      setError(null);

      try {
        const [loadedUsers, loadedDegreePrograms] = await Promise.all([
          fetchSecretaryUsers(),
          fetchSecretaryDegreePrograms(),
        ]);
        setUsers(loadedUsers);
        setDegreePrograms(loadedDegreePrograms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      } finally {
        setLoading(false);
      }
    }

    void loadUsersPage();
  }, []);

  const isFormDirty = JSON.stringify(userForm) !== JSON.stringify(savedUserForm);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  function updateUserFormField<K extends keyof UserFormState>(
    field: K,
    value: UserFormState[K]
  ) {
    // Cambiando ruolo i corsi selezionati restano in memoria (il campo viene solo
    // nascosto) e non vengono inviati se l'utente e di segreteria: vedi handleSaveUser.
    setUserForm((current) => ({
      ...current,
      [field]: value,
    }));
    setServerFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const next = { ...current };
      delete next[field as UserFormField];
      return next;
    });
  }

  async function refreshUsers() {
    const loadedUsers = await fetchSecretaryUsers();
    setUsers(loadedUsers);
  }

  function startEditUser(selectedUser: User) {
    const formFromUser: UserFormState = {
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: selectedUser.role,
      managedDegreeProgramIds: selectedUser.managedDegreeProgramIds ?? [],
    };
    setEditingUserId(selectedUser.id);
    setUserForm(formFromUser);
    setSavedUserForm(formFromUser);
    setShowFieldErrors(false);
    setServerFieldErrors({});
  }

  function resetUserForm() {
    setEditingUserId(null);
    setUserForm(defaultUserForm);
    setSavedUserForm(defaultUserForm);
    setShowFieldErrors(false);
    setServerFieldErrors({});
  }

  async function handleSaveUser() {
    setError(null);
    setSuccessMessage(null);
    setServerFieldErrors({});

    const clientErrors = getUserFormErrors(userForm, Boolean(editingUserId));
    const firstInvalidField = (['name', 'email', 'password'] as UserFormField[]).find(
      (field) => clientErrors[field]
    );

    if (firstInvalidField) {
      setShowFieldErrors(true);
      document.getElementById(`user-${firstInvalidField}`)?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        managedDegreeProgramIds:
          userForm.role === UserRole.TEACHER
            ? userForm.managedDegreeProgramIds
            : [],
      };

      if (editingUserId) {
        await updateSecretaryUser(editingUserId, payload);
        setSuccessMessage('Utente aggiornato');
      } else {
        await createSecretaryUser({
          ...payload,
          password: userForm.password,
        });
        setSuccessMessage('Utente creato');
      }

      await refreshUsers();
      resetUserForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operazione non riuscita';
      const field = getServerFieldError(message);

      if (field) {
        setServerFieldErrors({ [field]: message });
        document.getElementById(`user-${field}`)?.focus();
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser(id: number) {
    const userToDelete = users.find((currentUser) => currentUser.id === id);
    const consequences =
      userToDelete?.role === UserRole.TEACHER
        ? 'Il docente non potrà più accedere e le materie e gli appelli a lui collegati potrebbero non essere più gestibili.'
        : 'L’utente non potrà più accedere al sistema.';

    if (
      !window.confirm(
        `Vuoi eliminare l’utente «${userToDelete?.name ?? ''}» (${userToDelete?.email ?? ''})?\n\n` +
          `${consequences} L’operazione non può essere annullata.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteSecretaryUser(id);
      await refreshUsers();

      if (editingUserId === id) {
        resetUserForm();
      }

      setSuccessMessage('Utente eliminato');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  const clientFieldErrors = showFieldErrors
    ? getUserFormErrors(userForm, Boolean(editingUserId))
    : {};
  const fieldErrors: UserFormErrors = { ...clientFieldErrors, ...serverFieldErrors };

  function fieldErrorProps(field: UserFormField, hintId?: string) {
    const describedBy = [fieldErrors[field] ? `user-${field}-error` : undefined, hintId]
      .filter(Boolean)
      .join(' ');

    return {
      id: `user-${field}`,
      'aria-required': true,
      'aria-invalid': fieldErrors[field] ? true : undefined,
      'aria-describedby': describedBy || undefined,
    } as const;
  }

  function renderFieldError(field: UserFormField) {
    return fieldErrors[field] ? (
      <span className="field-error" id={`user-${field}-error`}>
        {fieldErrors[field]}
      </span>
    ) : null;
  }

  const visibleUsers = users
    .filter(
      (currentUser) =>
        (userRoleFilter === '' || currentUser.role === userRoleFilter) &&
        matchesSearch(userSearch, currentUser.name, currentUser.email)
    )
    .sort((first, second) =>
      userSort === 'name-desc'
        ? compareText(second.name, first.name)
        : compareText(first.name, second.name)
    );

  if (loading) {
    return <section className="dashboard-grid secretary-layout">Caricamento utenti...</section>;
  }

  return (
    <>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {successMessage ? <div className="alert success" role="status">{successMessage}</div> : null}

      <section className="dashboard-grid secretary-layout">
        <form
          className="panel"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveUser();
          }}
        >
          <div className="panel__header">
            <div>
              <p className="eyebrow">Utenti</p>
              <h2>{editingUserId ? 'Modifica utente' : 'Nuovo utente'}</h2>
            </div>
          </div>

          <p className="field-hint required-legend">
            I campi contrassegnati da <span aria-hidden="true">*</span>
            <span className="visually-hidden">asterisco</span> sono obbligatori.
          </p>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="user-name">
                <span>
                  Nome <span className="required-mark" aria-hidden="true">*</span>
                </span>
              </label>
              <input
                {...fieldErrorProps('name')}
                value={userForm.name}
                onChange={(event) =>
                  updateUserFormField('name', event.target.value)
                }
                placeholder="Marco Rossi"
              />
              {renderFieldError('name')}
            </div>

            <div className="form-field">
              <label htmlFor="user-email">
                <span>
                  E-mail <span className="required-mark" aria-hidden="true">*</span>
                </span>
              </label>
              <input
                {...fieldErrorProps('email')}
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  updateUserFormField('email', event.target.value)
                }
                placeholder="marcorossi@icloud.com"
              />
              {renderFieldError('email')}
            </div>

            <label>
              Ruolo
              <select
                value={userForm.role}
                onChange={(event) =>
                  updateUserFormField('role', event.target.value as UserRole)
                }
              >
                <option value={UserRole.TEACHER}>Docente</option>
                <option value={UserRole.SECRETARY}>Segreteria</option>
              </select>
            </label>

            {!editingUserId ? (
              <div className="form-field">
                <label htmlFor="user-password">
                  <span>
                    Password <span className="required-mark" aria-hidden="true">*</span>
                  </span>
                </label>
                <input
                  {...fieldErrorProps('password', 'user-password-hint')}
                  type="password"
                  value={userForm.password}
                  onChange={(event) =>
                    updateUserFormField('password', event.target.value)
                  }
                  placeholder="Password1!"
                />
                <span className="field-hint" id="user-password-hint">
                  Almeno 8 caratteri, con una lettera maiuscola e un carattere
                  speciale tra ?^!@#.
                </span>
                {renderFieldError('password')}
              </div>
            ) : null}
          </div>

          {userForm.role === UserRole.TEACHER ? (
            <CheckboxGroup
              legend="Corsi gestiti"
              hint="Seleziona uno o più corsi di laurea su cui il docente potrà pianificare gli appelli."
              emptyMessage="Non ci sono ancora corsi di laurea: creali nella sezione «Corsi di laurea»."
              options={degreePrograms.map((program) => ({
                value: program.id,
                label: `${program.code} - ${program.name}`,
              }))}
              selectedValues={userForm.managedDegreeProgramIds}
              onChange={(selectedIds) =>
                updateUserFormField('managedDegreeProgramIds', selectedIds)
              }
            />
          ) : null}

          <div className="inline-actions">
            <button
              type="submit"
              className="primary"
              disabled={isSubmitting}
            >
              {editingUserId ? 'Salva modifiche' : 'Aggiungi utente'}
            </button>
            {editingUserId ? (
              <button
                type="button"
                className="secondary"
                onClick={resetUserForm}
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
              <p className="eyebrow">Utenti</p>
              <h2>Elenco utenti</h2>
            </div>
          </div>

          <ListToolbar
            search={userSearch}
            onSearchChange={setUserSearch}
            searchPlaceholder="Nome o e-mail"
            sort={userSort}
            onSortChange={setUserSort}
            sortOptions={[
              { value: 'name-asc', label: 'Nome (A-Z)' },
              { value: 'name-desc', label: 'Nome (Z-A)' },
            ]}
          >
            <label>
              Ruolo
              <select
                value={userRoleFilter}
                onChange={(event) =>
                  setUserRoleFilter(event.target.value as UserRole | '')
                }
              >
                <option value="">Tutti i ruoli</option>
                <option value={UserRole.TEACHER}>Docenti</option>
                <option value={UserRole.SECRETARY}>Segreteria</option>
              </select>
            </label>
          </ListToolbar>

          <div className="panel-section">
            {users.length === 0 ? (
              <p className="empty-state">
                Nessun utente inserito. Usa il modulo «Nuovo utente» per aggiungerne uno.
              </p>
            ) : null}
            {users.length > 0 && visibleUsers.length === 0 ? (
              <p className="empty-state">Nessun utente corrisponde ai filtri.</p>
            ) : null}
            {visibleUsers.map((currentUser) => (
              <div className="summary-row list-row" key={currentUser.id}>
                <span>
                  {currentUser.name}
                  {currentUser.id === currentUserId ? ' (tu)' : ''}
                  <br />
                  {currentUser.email}
                </span>
                <span>
                  {getUserRoleLabel(currentUser.role)}
                  {currentUser.role === UserRole.TEACHER ? (
                    <>
                      <br />
                      {getDegreeProgramNames(
                        currentUser.managedDegreeProgramIds ?? [],
                        degreePrograms
                      ) || 'Nessun corso assegnato'}
                    </>
                  ) : null}
                </span>
                <span className="inline-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => startEditUser(currentUser)}
                    disabled={isSubmitting}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void handleDeleteUser(currentUser.id)}
                    disabled={isSubmitting || currentUser.id === currentUserId}
                    aria-describedby={
                      currentUser.id === currentUserId ? 'self-delete-hint' : undefined
                    }
                  >
                    Elimina
                  </button>
                  {currentUser.id === currentUserId ? (
                    <small id="self-delete-hint" className="row-hint">
                      Non puoi eliminare l'account con cui hai effettuato l'accesso.
                    </small>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
