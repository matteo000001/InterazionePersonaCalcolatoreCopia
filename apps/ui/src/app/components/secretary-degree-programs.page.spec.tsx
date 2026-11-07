/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createSecretaryDegreeProgram,
  deleteSecretaryDegreeProgram,
  fetchSecretaryDegreePrograms,
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
});
