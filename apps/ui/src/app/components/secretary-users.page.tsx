import { useEffect, useState } from 'react';
import { DegreeProgram, User, UserRole } from '@exam-planner/shared-types';
import {
  createSecretaryUser,
  deleteSecretaryUser,
  fetchSecretaryDegreePrograms,
  fetchSecretaryUsers,
  updateSecretaryUser,
} from './secretary.api';
import { defaultUserForm, UserFormState } from './secretary-dashboard.types';

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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  }

  function selectManagedDegreePrograms(options: HTMLSelectElement) {
    const selectedIds = Array.from(options.selectedOptions).map(
      (option) => option.value
    );

    updateUserFormField('managedDegreeProgramIds', selectedIds);
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
  }

  function resetUserForm() {
    setEditingUserId(null);
    setUserForm(defaultUserForm);
    setSavedUserForm(defaultUserForm);
  }

  async function handleSaveUser() {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name: userForm.name,
        email: userForm.email,
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
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser(id: number) {
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

  if (loading) {
    return <section className="dashboard-grid secretary-layout">Caricamento utenti...</section>;
  }

  return (
    <>
      {error ? <div className="alert error">{error}</div> : null}
      {successMessage ? <div className="alert success">{successMessage}</div> : null}

      <section className="dashboard-grid secretary-layout">
        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Utenti</p>
              <h2>{editingUserId ? 'Modifica utente' : 'Nuovo utente'}</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Nome
              <input
                value={userForm.name}
                onChange={(event) =>
                  updateUserFormField('name', event.target.value)
                }
                placeholder="Marco Rossi"
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  updateUserFormField('email', event.target.value)
                }
                placeholder="marcorossi@icloud.com"
              />
            </label>

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
              <label>
                Password
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) =>
                    updateUserFormField('password', event.target.value)
                  }
                  placeholder="Password1!"
                />
              </label>
            ) : null}
          </div>

          {userForm.role === UserRole.TEACHER ? (
            <label>
              Corsi gestiti
              <select
                multiple
                value={userForm.managedDegreeProgramIds}
                onChange={(event) =>
                  selectManagedDegreePrograms(event.currentTarget)
                }
              >
                {degreePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="inline-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void handleSaveUser()}
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
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Utenti</p>
              <h2>Elenco utenti</h2>
            </div>
          </div>

          <div className="panel-section">
            {users.map((currentUser) => (
              <div className="summary-row" key={currentUser.id}>
                <span>
                  {currentUser.name}
                  <br />
                  {currentUser.email}
                </span>
                <span>
                  {currentUser.role}
                  <br />
                  {(currentUser.managedDegreeProgramIds ?? []).join(', ') || '-'}
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
