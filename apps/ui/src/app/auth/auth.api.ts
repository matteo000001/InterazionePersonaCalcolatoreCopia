import { User, UserRole } from '@exam-planner/shared-types';

const API_URL = 'http://localhost:3333/api';
export const ACCESS_TOKEN_KEY = 'access_token';

export interface AuthResponse {
  access_token: string;
  user: User;
}

export async function login(email: string, password: string) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      'Impossibile contattare il server. Verifica la connessione e riprova.'
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Credenziali non valide');
    }

    const error = await response.json().catch(() => ({ message: undefined }));
    const message = Array.isArray(error.message) ? undefined : error.message;

    throw new Error(
      message ?? 'Il servizio non è disponibile al momento. Riprova più tardi.'
    );
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);

  return data;
}

export async function register(body: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registrazione non riuscita' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message;

    throw new Error(message ?? 'Registrazione non riuscita');
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);

  return data;
}

export function logout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('exam-planner-access-token');
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}
