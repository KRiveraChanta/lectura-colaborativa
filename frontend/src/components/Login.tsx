import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      login(data.user, data.token);
      navigate('/catalog');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center h-100 p-4" style={{ backgroundColor: 'var(--surface-ground)' }}>
      <div className="text-center mb-4 mt-5">
        <div className="bg-primary text-white d-inline-flex justify-content-center align-items-center rounded-circle mb-3 shadow" style={{ width: '64px', height: '64px', fontSize: '2rem', fontWeight: 'bold' }}>
          L
        </div>
        <h2 className="fw-bolder" style={{ color: 'var(--text-color)' }}>Bienvenido de nuevo</h2>
        <p className="text-secondary">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="fw-bold text-primary text-decoration-none">
            Regístrate aquí
          </Link>
        </p>
      </div>

      <Card className="w-100 shadow-sm border-0" style={{ maxWidth: '400px' }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3">
              <Message severity="error" text={error} className="w-100 justify-content-start" />
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-bold">Correo Electrónico</label>
            <InputText
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-100 p-inputtext-lg"
              placeholder="tu@email.com"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-bold">Contraseña</label>
            <Password
              id="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              toggleMask
              feedback={false}
              className="w-100 p-fluid"
              inputClassName="w-100 p-inputtext-lg"
              placeholder="••••••••"
              style={{ width: '100%', display: 'flex' }}
              inputStyle={{ width: '100%', flex: '1 1 auto' }}
            />
          </div>

          <div className="d-flex justify-content-end mb-4">
            <Link to="/forgot-password" className="small fw-bold text-primary text-decoration-none">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            label={isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            icon={isLoading ? "pi pi-spin pi-spinner" : ""}
            disabled={isLoading}
            className="w-100 p-button-lg shadow"
          />
        </form>
      </Card>
    </div>
  );
};
