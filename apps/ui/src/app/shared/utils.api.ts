import { logout } from '../auth/auth.api';

export const SESSION_EXPIRED_NOTICE_KEY = 'session-expired-notice';

export async function handleApiError(response: Response): Promise<never> {
  if (response.status === 401) {
    logout();

    if (!window.location.pathname.startsWith('/login')) {
      sessionStorage.setItem(
        SESSION_EXPIRED_NOTICE_KEY,
        'La tua sessione è scaduta. Accedi di nuovo per continuare.'
      );
      window.location.assign('/login');
    }

    throw new Error('Sessione scaduta. Reindirizzamento al login...');
  }

  const error = await response.json().catch(() => ({
    message: 'Errore inatteso',
  }));
  const message = Array.isArray(error.message)
    ? error.message.join(', ')
    : error.message;

  throw new Error(message ?? 'Errore inatteso');
}
