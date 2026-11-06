/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserRole } from '@exam-planner/shared-types';
import { login, register } from './auth.api';
import { LoginPage } from './login.page';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
jest.mock('./auth.api');

const authResponse = {
  access_token: 'test-token',
  user: {
    id: 1,
    name: 'Docente Test',
    email: 'docente@example.com',
    role: UserRole.TEACHER,
  },
};

function fillCredentials(password: string) {
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'docente@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  });
}

function openRegistration() {
  fireEvent.click(screen.getByRole('button', { name: 'Registrati' }));
  fireEvent.change(screen.getByLabelText('Nome'), {
    target: { value: 'Docente Test' },
  });
}

describe('Password di registrazione', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it('mostra tutti i requisiti prima dell’invio, solo in registrazione', () => {
    render(<LoginPage />);
    expect(screen.queryByText('Almeno 8 caratteri.')).toBeNull();

    openRegistration();

    expect(screen.getByText('Almeno 8 caratteri.')).toBeTruthy();
    expect(screen.getByText('Almeno una lettera maiuscola da A a Z.')).toBeTruthy();
    expect(screen.getByText('Almeno un carattere speciale tra ?^!@#.')).toBeTruthy();
    expect(screen.getByLabelText('Password').getAttribute('aria-describedby'))
      .toBe('password-requirements');
  });

  it('mostra insieme gli errori italiani vicino al campo e impedisce l’invio', () => {
    render(<LoginPage />);
    openRegistration();
    fillCredentials('abc');

    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    const error = screen.getByRole('alert');
    expect(error.textContent).toContain('Almeno 8 caratteri.');
    expect(error.textContent).toContain('Almeno una lettera maiuscola da A a Z.');
    expect(error.textContent).toContain('Almeno un carattere speciale tra ?^!@#.');
    expect(screen.getByLabelText('Password').getAttribute('aria-describedby'))
      .toBe('password-requirements password-error');
    expect(document.activeElement).toBe(screen.getByLabelText('Password'));
    expect(register).not.toHaveBeenCalled();
  });

  it('consente di correggere la password e registrarsi senza richiedere numeri', async () => {
    jest.mocked(register).mockResolvedValue(authResponse);
    render(<LoginPage />);
    openRegistration();
    fillCredentials('abc');
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    fillCredentials('Abcdefg!');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/teacher', {
      replace: true,
    }));
    expect(register).toHaveBeenCalledWith({
      name: 'Docente Test',
      email: 'docente@example.com',
      role: UserRole.TEACHER,
      password: 'Abcdefg!',
    });
  });

  it('non applica i vincoli di registrazione al login', async () => {
    jest.mocked(login).mockResolvedValue(authResponse);
    render(<LoginPage />);
    fillCredentials('abc');

    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith('docente@example.com', 'abc'));
    expect(register).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
