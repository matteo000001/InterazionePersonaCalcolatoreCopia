import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@exam-planner/shared-types';
import { login, register } from './auth.api';
import { usePageTitle } from '../shared/use-page-title';
import { SESSION_EXPIRED_NOTICE_KEY } from '../shared/utils.api';

type AuthMode = 'login' | 'register';

const passwordRequirements = [
  {
    description: 'Almeno 8 caratteri.',
    isSatisfied: (value: string) => Array.from(value).length >= 8,
  },
  {
    description: 'Almeno una lettera maiuscola da A a Z.',
    isSatisfied: (value: string) => /[A-Z]/.test(value),
  },
  {
    description: 'Almeno un carattere speciale tra ?^!@#.',
    isSatisfied: (value: string) => /[?^!@#]/.test(value),
  },
];

export function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const isRegistering = authMode === 'register';
  usePageTitle(isRegistering ? 'Registrazione' : 'Accesso');

  useEffect(() => {
    const sessionExpiredNotice = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);

    if (sessionExpiredNotice) {
      sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      setError(sessionExpiredNotice);
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPasswordError(null);

    if (isRegistering) {
      const missingRequirements = passwordRequirements.filter(
        (requirement) => !requirement.isSatisfied(password)
      );

      if (missingRequirements.length > 0) {
        setPasswordError(
          `La password non è valida. ${missingRequirements
            .map((requirement) => requirement.description)
            .join(' ')}`
        );
        passwordInputRef.current?.focus();
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = isRegistering
        ? await register({ name, email, password, role: UserRole.TEACHER })
        : await login(email, password);

      navigate(
        response.user.role === UserRole.SECRETARY ? '/secretary' : '/teacher',
        { replace: true }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-avatar" aria-hidden="true">
          <span />
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Pianificatore appelli</p>
          <h1>{isRegistering ? 'Crea il tuo accesso' : 'Accedi al portale'}</h1>
        </div>

        <div className="auth-tabs" aria-label="Seleziona azione">
          <button
            type="button"
            className={authMode === 'login' ? 'is-active' : ''}
            onClick={() => {
              setAuthMode('login');
              setError(null);
              setPasswordError(null);
            }}
          >
            Accedi
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'is-active' : ''}
            onClick={() => {
              setAuthMode('register');
              setError(null);
              setPasswordError(null);
            }}
          >
            Registrati
          </button>
        </div>

        {error ? <div className="alert error" role="alert">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering ? (
            <label>
              Nome
              <input
                type="text"
                value={name}
                placeholder="marco rossi"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          ) : null}

          <label>
            E-mail
            <input
              type="email"
              value={email}
              placeholder="Inserisci la tua e-mail"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="auth-password-field">
            <label htmlFor="auth-password">
              Password
              <input
                id="auth-password"
                ref={passwordInputRef}
                type="password"
                value={password}
                placeholder="Inserisci la tua password"
                aria-describedby={
                  isRegistering
                    ? `password-requirements${passwordError ? ' password-error' : ''}`
                    : undefined
                }
                aria-invalid={isRegistering && passwordError ? true : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError(null);
                }}
                required
              />
            </label>
            {isRegistering ? (
              <div id="password-requirements" className="auth-password-hint">
                <p>La password deve rispettare questi requisiti:</p>
                <ul>
                  {passwordRequirements.map((requirement) => (
                    <li key={requirement.description}>{requirement.description}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isRegistering && passwordError ? (
              <p id="password-error" className="auth-field-error" role="alert">
                {passwordError}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="primary auth-submit"
            disabled={
              isSubmitting ||
              !email ||
              !password ||
              (isRegistering && !name)
            }
          >
            {isRegistering ? 'Registrati' : 'Accedi'}
          </button>
        </form>
      </section>
    </main>
  );
}
