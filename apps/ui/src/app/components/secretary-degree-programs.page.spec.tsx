/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createSecretaryDegreeProgram,
  deleteSecretaryDegreeProgram,
  fetchSecretaryDegreePrograms,
  updateSecretaryDegreeProgram,
} from './secretary.api';
import { SecretaryDegreeProgramsPage } from './secretary-degree-programs.page';

jest.mock('./secretary.api');

async function renderPage() {
  render(<SecretaryDegreeProgramsPage />);
  await screen.findByRole('heading', { name: 'Elenco corsi' });
}

function rowOf(text: RegExp) {
  return screen.getAllByText(text)
    .map((element) => element.closest('.summary-row'))
    .find(Boolean) as HTMLElement;
}

describe('Corsi di laurea', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(fetchSecretaryDegreePrograms).mockResolvedValue([
      { id: 'ingInf', code: 'L-8', name: 'Ingegneria Informatica', durationYears: 3 },
      { id: 'ingGest', code: 'L-9', name: 'Ingegneria Gestionale', durationYears: 3 },
    ]);
    jest.mocked(createSecretaryDegreeProgram).mockResolvedValue({
      id: 'ingElet', code: 'L-8', name: 'Ingegneria Elettronica', durationYears: 3,
    });
    jest.mocked(deleteSecretaryDegreeProgram).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('chiede conferma prima di eliminare un corso e non elimina se si annulla', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();
    const row = rowOf(/Ingegneria Gestionale/);

    fireEvent.click(within(row).getByRole('button', { name: 'Elimina' }));

    expect(confirmSpy.mock.calls[0][0]).toContain('«Ingegneria Gestionale (L-9)»');
    expect(confirmSpy.mock.calls[0][0]).toContain('materie e appelli collegati');
    expect(deleteSecretaryDegreeProgram).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(within(row).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(deleteSecretaryDegreeProgram).toHaveBeenCalledWith('ingGest'));
  });
  it('crea un corso senza chiedere l’identificativo tecnico e non lo mostra nell’elenco', async () => {
    await renderPage();

    expect(screen.queryByRole('textbox', { name: 'Identificativo' })).toBeNull();
    expect(screen.queryByText(/ingInf|ingGest/)).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Codice' }), { target: { value: 'L-8' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Ingegneria Elettronica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi corso di laurea' }));

    await waitFor(() => expect(createSecretaryDegreeProgram).toHaveBeenCalledWith({
      code: 'L-8',
      name: 'Ingegneria Elettronica',
      durationYears: 3,
    }));
  });
  it('permette di modificare un corso esistente come utenti e materie', async () => {
    jest.mocked(updateSecretaryDegreeProgram).mockResolvedValue({
      id: 'ingGest', code: 'L-9', name: 'Ingegneria Gestionale', durationYears: 3,
    });
    await renderPage();
    const row = rowOf(/Ingegneria Gestionale/);

    fireEvent.click(within(row).getByRole('button', { name: 'Modifica' }));

    expect(screen.getByRole('heading', { name: 'Modifica corso di laurea' })).toBeTruthy();
    const name = screen.getByRole('textbox', { name: 'Nome' }) as HTMLInputElement;
    expect(name.value).toBe('Ingegneria Gestionale');
    expect((screen.getByRole('textbox', { name: 'Codice' }) as HTMLInputElement).value).toBe('L-9');

    fireEvent.change(name, { target: { value: 'Ingegneria Gestionale e della Logistica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));

    await waitFor(() => expect(updateSecretaryDegreeProgram).toHaveBeenCalledWith('ingGest', {
      code: 'L-9',
      name: 'Ingegneria Gestionale e della Logistica',
      durationYears: 3,
    }));
    expect(createSecretaryDegreeProgram).not.toHaveBeenCalled();
    expect(deleteSecretaryDegreeProgram).not.toHaveBeenCalled();
    expect(await screen.findByText('Corso di laurea aggiornato')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Nuovo corso di laurea' })).toBeTruthy();
  });

  it('annulla la modifica e torna al modulo per un nuovo corso', async () => {
    await renderPage();
    fireEvent.click(within(rowOf(/Ingegneria Informatica/)).getByRole('button', { name: 'Modifica' }));

    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(screen.getByRole('heading', { name: 'Nuovo corso di laurea' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Nome' }) as HTMLInputElement).value).toBe('');
  });
});
