import {
  CourseYear,
  DegreeProgram,
  ExamAppointment,
  ExamSession,
  Subject,
  User,
  UserRole,
} from '@exam-planner/shared-types';
import { handleApiError } from '../shared/utils.api';

const API_URL = 'http://localhost:3333/api';

function getAuthHeaders() {
  const token = localStorage.getItem('access_token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export type CreateSecretaryUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managedDegreeProgramIds?: string[];
};

export type UpdateSecretaryUserPayload = Partial<
  Omit<CreateSecretaryUserPayload, 'password'>
>;

export type CreateSecretarySubjectPayload = {
  name: string;
  teacherId: number;
  degreeProgramIds: string[];
  courseYearId: string;
};

export type UpdateSecretarySubjectPayload = Partial<CreateSecretarySubjectPayload>;

// L'identificativo interno viene generato dal server a partire dal nome.
export type CreateSecretaryDegreeProgramPayload = {
  code: string;
  name: string;
  durationYears: number;
};

export async function fetchSecretaryUsers(role?: UserRole): Promise<User[]> {
  const searchParams = new URLSearchParams();

  if (role) {
    searchParams.set('role', role);
  }

  const response = await fetch(
    `${API_URL}/users${searchParams.size ? `?${searchParams.toString()}` : ''}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function createSecretaryUser(
  payload: CreateSecretaryUserPayload
): Promise<User> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function updateSecretaryUser(
  id: number,
  payload: UpdateSecretaryUserPayload
): Promise<void> {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
}

export async function deleteSecretaryUser(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
}

export async function fetchSecretarySubjects(filters?: {
  teacherId?: number;
  degreeProgramId?: string;
  courseYearId?: string;
}): Promise<Subject[]> {
  const searchParams = new URLSearchParams();

  if (filters?.teacherId) {
    searchParams.set('teacherId', String(filters.teacherId));
  }

  if (filters?.degreeProgramId) {
    searchParams.set('degreeProgramId', filters.degreeProgramId);
  }

  if (filters?.courseYearId) {
    searchParams.set('courseYearId', filters.courseYearId);
  }

  const response = await fetch(
    `${API_URL}/subjects${searchParams.size ? `?${searchParams.toString()}` : ''}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function createSecretarySubject(
  payload: CreateSecretarySubjectPayload
): Promise<Subject> {
  const response = await fetch(`${API_URL}/subjects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function updateSecretarySubject(
  id: number,
  payload: UpdateSecretarySubjectPayload
): Promise<Subject> {
  const response = await fetch(`${API_URL}/subjects/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function deleteSecretarySubject(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/subjects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
}

export async function fetchSecretaryDegreePrograms(): Promise<DegreeProgram[]> {
  const response = await fetch(`${API_URL}/degree-programs`, {
    headers: getAuthHeaders(),
  });

  // Il backend risponde 404 quando non esiste ancora alcun corso: e un elenco vuoto.
  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function createSecretaryDegreeProgram(
  payload: CreateSecretaryDegreeProgramPayload
): Promise<DegreeProgram> {
  const response = await fetch(`${API_URL}/degree-programs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export type UpdateSecretaryDegreeProgramPayload =
  Partial<CreateSecretaryDegreeProgramPayload>;

export async function updateSecretaryDegreeProgram(
  id: string,
  payload: UpdateSecretaryDegreeProgramPayload
): Promise<DegreeProgram> {
  const response = await fetch(`${API_URL}/degree-programs/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function deleteSecretaryDegreeProgram(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/degree-programs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }
}

export async function fetchSecretaryCourseYears(): Promise<CourseYear[]> {
  const response = await fetch(`${API_URL}/course-years`, {
    headers: getAuthHeaders(),
  });

  // Il backend risponde 404 quando non esiste ancora alcun anno: e un elenco vuoto.
  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function fetchCurrentSession(): Promise<ExamSession> {
  const response = await fetch(`${API_URL}/sessions/current`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// Restituisce null solo se la sessione non esiste (404); ogni altro errore viene propagato.
export async function fetchCurrentSessionIfExists(): Promise<ExamSession | null> {
  const response = await fetch(`${API_URL}/sessions/current`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function createCurrentSession(
  payload: Omit<ExamSession, 'id'>
): Promise<ExamSession> {
  const response = await fetch(`${API_URL}/sessions/current`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function saveCurrentSession(
  payload: Omit<ExamSession, 'id'>
): Promise<ExamSession> {
  const response = await fetch(`${API_URL}/sessions/current`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function fetchSecretaryAppointments(filters?: {
  degreeProgramId?: string;
  courseYearId?: string;
}): Promise<ExamAppointment[]> {
  const searchParams = new URLSearchParams();

  if (filters?.degreeProgramId) {
    searchParams.set('degreeProgramId', filters.degreeProgramId);
  }

  if (filters?.courseYearId) {
    searchParams.set('courseYearId', filters.courseYearId);
  }

  const response = await fetch(`${API_URL}/appointments${searchParams.size ? `?${searchParams.toString()}` : ''}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}
