import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { User, UserRole } from '@exam-planner/shared-types';
import { api } from '../api';
import { getAccessToken } from '../auth/auth.api';
import { usePageTitle } from '../shared/use-page-title';
import { SecretaryAppointmentsSearchPage } from './secretary-appointments-search.page';
import { SecretaryDegreeProgramsPage } from './secretary-degree-programs.page';
import { SecretaryHomePage } from './secretary-home.page';
import { SecretarySubjectsPage } from './secretary-subjects.page';
import { SecretaryMenuItem } from './secretary-dashboard.types';
import { SecretaryUsersPage } from './secretary-users.page';

const secretaryPageTitles: Record<SecretaryMenuItem, string> = {
  home: 'Pagina iniziale – Segreteria',
  users: 'Utenti – Segreteria',
  subjects: 'Materie – Segreteria',
  'degree-programs': 'Corsi di laurea – Segreteria',
  appointments: 'Visualizza appelli – Segreteria',
};

// Ogni sezione ha il proprio indirizzo: il tasto «Indietro» del browser torna
// alla sezione precedente e ricaricando la pagina si resta nella stessa sezione.
const secretarySectionPaths: Record<SecretaryMenuItem, string> = {
  home: '',
  users: 'utenti',
  subjects: 'materie',
  'degree-programs': 'corsi-di-laurea',
  appointments: 'appelli',
};

function getSecretarySectionUrl(menuItem: SecretaryMenuItem) {
  const path = secretarySectionPaths[menuItem];
  return path ? `/secretary/${path}` : '/secretary';
}

function getMenuItemFromPath(path: string): SecretaryMenuItem | undefined {
  const normalizedPath = path.replace(/\/+$/, '');

  return (Object.keys(secretarySectionPaths) as SecretaryMenuItem[]).find(
    (menuItem) => secretarySectionPaths[menuItem] === normalizedPath
  );
}

export function SecretaryDashboard() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const sectionPath = useParams()['*'] ?? '';
  const requestedMenuItem = getMenuItemFromPath(sectionPath);
  const [user, setUser] = useState<User | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<SecretaryMenuItem>(
    requestedMenuItem ?? 'home'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Vero quando l'uscita dal modulo è già stata confermata dal clic sul menu.
  const leaveConfirmedRef = useRef(false);

  usePageTitle(secretaryPageTitles[selectedMenuItem]);

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
  const confirmLeaveForm = useCallback(
    () =>
      !hasUnsavedChanges ||
      window.confirm(
        'Ci sono dati inseriti nel modulo e non ancora salvati. Se esci da questa sezione andranno persi. Vuoi continuare?'
      ),
    [hasUnsavedChanges]
  );

  // Sincronizza la sezione mostrata con l'indirizzo, anche quando cambia con
  // i tasti «Indietro»/«Avanti» del browser.
  useEffect(() => {
    if (!requestedMenuItem) {
      navigate(getSecretarySectionUrl('home'), { replace: true });
      return;
    }

    if (requestedMenuItem === selectedMenuItem) {
      return;
    }

    const canLeave = leaveConfirmedRef.current || confirmLeaveForm();
    leaveConfirmedRef.current = false;

    if (canLeave) {
      setHasUnsavedChanges(false);
      setSelectedMenuItem(requestedMenuItem);
    } else {
      // L'utente resta nel modulo: l'indirizzo torna quello della sezione mostrata.
      navigate(getSecretarySectionUrl(selectedMenuItem), { replace: true });
    }
  }, [confirmLeaveForm, navigate, requestedMenuItem, selectedMenuItem]);

  function selectMenuItem(menuItem: SecretaryMenuItem) {
    if (menuItem === selectedMenuItem || !confirmLeaveForm()) {
      return;
    }

    leaveConfirmedRef.current = true;
    navigate(getSecretarySectionUrl(menuItem));
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

        </div>
      </section>

      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {renderSelectedPage()}
    </main>
  );
}
