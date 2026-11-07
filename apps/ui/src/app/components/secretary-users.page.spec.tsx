/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { User, UserRole } from '@exam-planner/shared-types';
import {
  createSecretaryUser,
  deleteSecretaryUser,
  fetchSecretaryDegreePrograms,
  fetchSecretaryUsers,
  updateSecretaryUser,
} from './secretary.api';
import { SecretaryUsersPage } from './secretary-users.page';

jest.mock('./secretary.api');

const users: User[] = [
  {
    id: 1,
    name: 'Mario Bianchi',
    email: 'mario.bianchi@example.com',
    role: UserRole.TEACHER,
    managedDegreeProgramIds: ['ingInf', 'ingGest'],
  },
  {
    id: 2,
    name: 'Giulia Ferraro',
    email: 'giulia.ferraro@example.com',
    role: UserRole.SECRETARY,
    managedDegreeProgramIds: [],
  },
];

async function renderPage() {
  render(<SecretaryUsersPage currentUserId={2} />);
  await screen.findByRole('heading', { name: 'Nuovo utente' });
}

function errorOf(field: HTMLElement) {
  const ids = (field.getAttribute('aria-describedby') ?? '').split(' ');
  return ids
    .map((id) => document.getElementById(id))
    .find((element) => element?.classList.contains('field-error'))?.textContent;
}

describe('Utenti', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(fetchSecretaryUsers).mockResolvedValue(users);
    jest.mocked(fetchSecretaryDegreePrograms).mockResolvedValue([
      { id: 'ingInf', code: 'L-8', name: 'Ingegneria Informatica', durationYears: 3 },
      { id: 'ingGest', code: 'L-9', name: 'Ingegneria Gestionale', durationYears: 3 },
    ]);
    jest.mocked(createSecretaryUser).mockResolvedValue(users[0]);
    jest.mocked(updateSecretaryUser).mockResolvedValue(undefined);
    jest.mocked(deleteSecretaryUser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('segnala i campi obbligatori e mostra ogni errore in italiano sotto il proprio campo', async () => {
    await renderPage();
    const name = screen.getByRole('textbox', { name: 'Nome' });
    const email = screen.getByRole('textbox', { name: 'E-mail' });
    const password = screen.getByLabelText(/^Password/);
    expect(screen.getByText(/sono obbligatori/)).toBeTruthy();
    for (const field of [name, email, password]) {
      expect(field.getAttribute('aria-required')).toBe('true');
    }

    fireEvent.change(name, { target: { value: 'Al' } });
    fireEvent.change(email, { target: { value: 'non-una-mail' } });
    fireEvent.change(password, { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi utente' }));

    expect(createSecretaryUser).not.toHaveBeenCalled();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(errorOf(name)).toBe('Il nome deve contenere almeno 3 caratteri.');
    expect(errorOf(email)).toBe("Inserisci un'e-mail valida, ad esempio nome.cognome@ateneo.it.");
    expect(errorOf(password)).toBe(
      'La password deve contenere almeno 8 caratteri, una lettera maiuscola da A a Z, un carattere speciale tra ?^!@#.'
    );
    expect(document.activeElement).toBe(name);
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.change(name, { target: { value: 'Anna Verdi' } });
    expect(errorOf(name)).toBeUndefined();
    expect(name.getAttribute('aria-invalid')).toBeNull();
  });

  it('invia il modulo corretto e mostra sotto il campo l’errore del server sull’e-mail', async () => {
    jest.mocked(createSecretaryUser).mockRejectedValue(new Error('Esiste già un utente con questa e-mail.'));
    await renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Anna Verdi' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), { target: { value: 'mario.bianchi@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi utente' }));

    await waitFor(() => expect(createSecretaryUser).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Anna Verdi',
      email: 'mario.bianchi@example.com',
      password: 'Password1!',
    })));
    await waitFor(() => expect(errorOf(screen.getByRole('textbox', { name: 'E-mail' }))).toBe('Esiste già un utente con questa e-mail.'));
  });
  it('assegna i corsi gestiti con caselle di spunta: un clic aggiunge o toglie un solo corso', async () => {
    await renderPage();
    const group = screen.getByRole('group', { name: 'Corsi gestiti' });
    expect(within(group).queryByRole('listbox')).toBeNull();
    const informatica = within(group).getByRole('checkbox', { name: 'L-8 - Ingegneria Informatica' });
    const gestionale = within(group).getByRole('checkbox', { name: 'L-9 - Ingegneria Gestionale' });

    fireEvent.click(informatica);
    fireEvent.click(gestionale);
    expect(within(group).getByText('2 corsi selezionati.')).toBeTruthy();
    fireEvent.click(informatica);

    expect((informatica as HTMLInputElement).checked).toBe(false);
    expect((gestionale as HTMLInputElement).checked).toBe(true);
    expect(within(group).getByText('1 corso selezionato.')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Anna Verdi' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), { target: { value: 'anna.verdi@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi utente' }));

    await waitFor(() => expect(createSecretaryUser).toHaveBeenCalledWith(expect.objectContaining({
      managedDegreeProgramIds: ['ingGest'],
    })));
  });
  it('mostra nell’elenco ruoli e corsi con nomi leggibili invece dei codici interni', async () => {
    await renderPage();
    const rowOf = (email: RegExp) => screen.getByText(email).closest('.summary-row') as HTMLElement;
    const teacherRow = rowOf(/mario\.bianchi@example\.com/);
    const secretaryRow = rowOf(/giulia\.ferraro@example\.com/);

    expect(within(teacherRow).getByText(/^Docente/)).toBeTruthy();
    expect(within(teacherRow).getByText(/Ingegneria Informatica \(L-8\), Ingegneria Gestionale \(L-9\)/)).toBeTruthy();
    expect(within(secretaryRow).getByText(/^Segreteria/)).toBeTruthy();
    for (const code of ['teacher', 'secretary', 'ingInf', 'ingGest']) {
      expect(screen.queryByText(new RegExp(`\\b${code}\\b`))).toBeNull();
    }
  });
  it('chiede conferma prima di eliminare un utente e non elimina se si annulla', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();
    const teacherRow = screen.getByText(/mario\.bianchi@example\.com/).closest('.summary-row') as HTMLElement;
    const deleteButton = within(teacherRow).getByRole('button', { name: 'Elimina' });

    fireEvent.click(deleteButton);

    expect(confirmSpy.mock.calls[0][0]).toContain('«Mario Bianchi» (mario.bianchi@example.com)');
    expect(confirmSpy.mock.calls[0][0]).toContain('non può essere annullata');
    expect(deleteSecretaryUser).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(deleteSecretaryUser).toHaveBeenCalledWith(1));
  });
  it('impagina le righe dell’elenco su colonne a larghezza fissa', async () => {
    await renderPage();
    const stylesheet = readFileSync(join(__dirname, '../../styles.css'), 'utf8');
    const rows = screen.getAllByText(/@example\.com/).map((element) => element.closest('.summary-row'));

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row?.classList.contains('list-row')).toBe(true);
    }
    expect(stylesheet).toMatch(/\.summary-row\.list-row \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 190px;/);
  });
});
