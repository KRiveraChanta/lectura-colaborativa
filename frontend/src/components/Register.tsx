import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

export const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const regResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const regData = await regResponse.json();

      if (!regResponse.ok) {
        throw new Error(regData.message || 'Error al registrar usuario');
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        login(loginData.user, loginData.token);
        navigate('/catalog');
      } else {
        navigate('/login');
      }
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
        <h2 className="fw-bolder" style={{ color: 'var(--text-color)' }}>Crea tu cuenta</h2>
        <p className="text-secondary">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="fw-bold text-primary text-decoration-none">
            Inicia sesión
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
            <label htmlFor="username" className="form-label fw-bold">Nombre de Usuario</label>
            <InputText
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-100 p-inputtext-lg"
              placeholder="tu_usuario"
            />
          </div>

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

          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-bold">Contraseña</label>
            <Password
              id="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              toggleMask
              className="w-100 p-fluid"
              inputClassName="w-100 p-inputtext-lg"
              placeholder="••••••••"
              promptLabel="Elige una contraseña"
              weakLabel="Débil"
              mediumLabel="Media"
              strongLabel="Fuerte"
              style={{ width: '100%', display: 'flex' }}
              inputStyle={{ width: '100%', flex: '1 1 auto' }}
            />
          </div>

          <Button
            type="submit"
            label={isLoading ? "Creando cuenta..." : "Registrarse"}
            icon={isLoading ? "pi pi-spin pi-spinner" : ""}
            disabled={isLoading}
            className="w-100 p-button-lg shadow"
          />
        </form>
      </Card>
    </div>
  );
};
