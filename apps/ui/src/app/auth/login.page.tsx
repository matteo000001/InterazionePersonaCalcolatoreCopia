import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@exam-planner/shared-types';
import { login, register } from './auth.api';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const isRegistering = authMode === 'register';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
              placeholder="lucaferri@icloud.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder="Password1!"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

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
