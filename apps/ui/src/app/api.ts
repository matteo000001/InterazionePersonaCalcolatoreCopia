import {
  User,
} from '@exam-planner/shared-types';
import { handleApiError } from './shared/utils.api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  token?: string;
  method?: HttpMethod;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getMe: (token: string) => request<User>('/users/me', { token })
};
