/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '@exam-planner/shared-types';
import { api } from '../api';
import { getAccessToken } from '../auth/auth.api';
import { SecretaryDashboard } from './secretary-dashboard';

jest.mock('../api', () => ({ api: { getMe: jest.fn() } }));
jest.mock('../auth/auth.api', () => ({ getAccessToken: jest.fn() }));
jest.mock('./secretary-home.page', () => ({
  SecretaryHomePage: () => <h2>Sezione sessione</h2>,
}));
jest.mock('./secretary-users.page', () => ({
  SecretaryUsersPage: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <div>
      <h2>Sezione utenti</h2>
      <button type="button" onClick={() => onDirtyChange?.(true)}>Compila modulo</button>
    </div>
  ),
}));
jest.mock('./secretary-subjects.page', () => ({
  SecretarySubjectsPage: () => <h2>Sezione materie</h2>,
}));
jest.mock('./secretary-degree-programs.page', () => ({
  SecretaryDegreeProgramsPage: () => <h2>Sezione corsi</h2>,
}));
jest.mock('./secretary-appointments-search.page', () => ({
  SecretaryAppointmentsSearchPage: () => <h2>Sezione appelli</h2>,
}));

let navigateFromTest: ReturnType<typeof useNavigate>;

function LocationProbe() {
  const location = useLocation();
  navigateFromTest = useNavigate();
  useEffect(() => undefined, [location]);
  return <output aria-label="Indirizzo">{location.pathname}</output>;
}

async function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/secretary/*" element={<SecretaryDashboard />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
  await screen.findByRole('button', { name: 'Utenti' });
}

function currentPath() {
  return screen.getByRole('status', { name: 'Indirizzo' }).textContent;
}

describe('Navigazione del pannello segreteria', () => {
  beforeEach(() => {
    jest.mocked(getAccessToken).mockReturnValue('test-token');
    jest.mocked(api.getMe).mockResolvedValue({
      id: 9,
      name: 'Segreteria Test',
      email: 'segreteria@example.com',
      role: UserRole.SECRETARY,
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('cambia indirizzo a ogni voce del menu e il tasto «Indietro» torna alla sezione precedente', async () => {
    await renderAt('/secretary');
    expect(screen.getByRole('heading', { name: 'Sezione sessione' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Utenti' }));
    expect(currentPath()).toBe('/secretary/utenti');
    expect(screen.getByRole('heading', { name: 'Sezione utenti' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Materie' }));
    expect(currentPath()).toBe('/secretary/materie');
    expect(screen.getByRole('heading', { name: 'Sezione materie' })).toBeTruthy();

    act(() => navigateFromTest(-1));
    expect(currentPath()).toBe('/secretary/utenti');
    expect(screen.getByRole('heading', { name: 'Sezione utenti' })).toBeTruthy();
  });

  it('aprendo (o ricaricando) l’indirizzo di una sezione mostra quella sezione', async () => {
    await renderAt('/secretary/corsi-di-laurea');
    expect(screen.getByRole('heading', { name: 'Sezione corsi' })).toBeTruthy();
  });

  it('riporta alla sezione iniziale un indirizzo sconosciuto', async () => {
    await renderAt('/secretary/inesistente');
    expect(currentPath()).toBe('/secretary');
    expect(screen.getByRole('heading', { name: 'Sezione sessione' })).toBeTruthy();
  });

  it('con un modulo non salvato chiede conferma anche se si usa «Indietro»', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await renderAt('/secretary');
    fireEvent.click(screen.getByRole('button', { name: 'Utenti' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compila modulo' }));

    act(() => navigateFromTest(-1));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(currentPath()).toBe('/secretary/utenti');
    expect(screen.getByRole('heading', { name: 'Sezione utenti' })).toBeTruthy();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Materie' }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe('/secretary/materie');
    expect(screen.getByRole('heading', { name: 'Sezione materie' })).toBeTruthy();
  });
});
