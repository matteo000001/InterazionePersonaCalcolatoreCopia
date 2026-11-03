import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { User, UserRole } from '@exam-planner/shared-types';
import { api } from '../api';
import { getAccessToken } from '../auth/auth.api';
import { SecretaryAppointmentsSearchPage } from './secretary-appointments-search.page';
import { SecretaryDegreeProgramsPage } from './secretary-degree-programs.page';
import { SecretaryHomePage } from './secretary-home.page';
import { SecretarySubjectsPage } from './secretary-subjects.page';
import { SecretaryMenuItem } from './secretary-dashboard.types';
import { SecretaryUsersPage } from './secretary-users.page';

export function SecretaryDashboard() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const [user, setUser] = useState<User | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] =
    useState<SecretaryMenuItem>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      setLoading(true);
      setError(null);

      try {
        const me = await api.getMe(token);
        setUser(me);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Caricamento fallito');
      } finally {
        setLoading(false);
      }
    }

    void loadCurrentUser();
  }, [token]);

  // Chiede conferma prima di abbandonare un modulo compilato e non salvato.
  function confirmLeaveForm() {
    return (
      !hasUnsavedChanges ||
      window.confirm(
        'Ci sono dati inseriti nel modulo e non ancora salvati. Se esci da questa sezione andranno persi. Vuoi continuare?'
      )
    );
  }

  function selectMenuItem(menuItem: SecretaryMenuItem) {
    if (menuItem === selectedMenuItem || !confirmLeaveForm()) {
      return;
    }

    setHasUnsavedChanges(false);
    setSelectedMenuItem(menuItem);
  }

  function renderSelectedPage() {
    if (selectedMenuItem === 'home') {
      return <SecretaryHomePage />;
    }

    if (selectedMenuItem === 'users') {
      return (
        <SecretaryUsersPage
          currentUserId={user?.id}
          onDirtyChange={setHasUnsavedChanges}
        />
      );
    }

    if (selectedMenuItem === 'subjects') {
      return <SecretarySubjectsPage onDirtyChange={setHasUnsavedChanges} />;
    }

    if (selectedMenuItem === 'appointments') {
      return <SecretaryAppointmentsSearchPage />;
    }

    return <SecretaryDegreeProgramsPage onDirtyChange={setHasUnsavedChanges} />;
  }

  if (loading) {
    return <main className="app-shell loading-screen">Caricamento in corso...</main>;
  }

  if (user?.role === UserRole.TEACHER) {
    return <Navigate to="/teacher" replace />;
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-card">
          <div className="summary-row">
            <span>Utente</span>
            <strong>{user?.name ?? 'Segreteria'}</strong>
          </div>

          <div className="inline-actions">
            <button
              type="button"
              className={selectedMenuItem === 'home' ? 'primary' : 'secondary'}
              onClick={() => selectMenuItem('home')}
            >
              Pagina iniziale
            </button>
            <button
              type="button"
              className={selectedMenuItem === 'users' ? 'primary' : 'secondary'}
              onClick={() => selectMenuItem('users')}
            >
              Utenti
            </button>
            <button
              type="button"
              className={selectedMenuItem === 'subjects' ? 'primary' : 'secondary'}
              onClick={() => selectMenuItem('subjects')}
            >
              Materie
            </button>
            <button
              type="button"
              className={
                selectedMenuItem === 'degree-programs' ? 'primary' : 'secondary'
              }
              onClick={() => selectMenuItem('degree-programs')}
            >
              Corsi di laurea
            </button>
            <button
              type="button"
              className={
                selectedMenuItem === 'appointments' ? 'primary' : 'secondary'
              }
              onClick={() => selectMenuItem('appointments')}
            >
              Visualizza appelli
            </button>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (confirmLeaveForm()) {
                navigate('/logout');
              }
            }}
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
      {renderSelectedPage()}
    </main>
  );
}
