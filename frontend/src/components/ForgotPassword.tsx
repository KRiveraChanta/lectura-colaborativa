import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

export const ForgotPassword = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al solicitar el restablecimiento');
      }

      setResetToken(data.token);
      setStep(2);
      setMessage('Simulación: El código de recuperación se ha generado. Cópialo y pégalo abajo.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken.trim(), newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al restablecer la contraseña');
      }

      setIsSuccess(true);
      setMessage('Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.');
      setResetToken('');
      setInputToken('');
      setNewPassword('');
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
        <h2 className="fw-bolder" style={{ color: 'var(--text-color)' }}>Recuperar Contraseña</h2>
        <p className="text-secondary">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="fw-bold text-primary text-decoration-none">
            Inicia sesión
          </Link>
        </p>
      </div>

      <Card className="w-100 shadow-sm border-0" style={{ maxWidth: '400px' }}>
        {error && (
          <div className="mb-3">
            <Message severity="error" text={error} className="w-100 justify-content-start" />
          </div>
        )}
        
        {message && !isSuccess && (
          <div className="mb-3">
            <Message severity="info" text={message} className="w-100 justify-content-start align-items-start" />
            {resetToken && (
              <div className="mt-2 p-2 bg-light rounded text-break small font-monospace border">
                {resetToken}
              </div>
            )}
          </div>
        )}

        {isSuccess && (
          <div className="mb-3">
            <Message severity="success" text={message} className="w-100 justify-content-start" />
          </div>
        )}

        {!isSuccess && step === 1 && (
          <form onSubmit={handleRequestToken}>
            <div className="mb-4">
              <label htmlFor="email" className="form-label fw-bold">Ingresa tu Correo Electrónico</label>
              <InputText
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-100 p-inputtext-lg"
                placeholder="tu@email.com"
              />
            </div>

            <Button
              type="submit"
              label={isLoading ? "Solicitando..." : "Solicitar Código"}
              icon={isLoading ? "pi pi-spin pi-spinner" : ""}
              disabled={isLoading}
              className="w-100 p-button-lg shadow"
            />
          </form>
        )}

        {!isSuccess && step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label htmlFor="token" className="form-label fw-bold">Código de Recuperación</label>
              <InputText
                id="token"
                name="token"
                type="text"
                required
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-100 p-inputtext-lg"
                placeholder="Pega tu código aquí..."
              />
            </div>

            <div className="mb-4">
              <label htmlFor="newPassword" className="form-label fw-bold">Nueva Contraseña</label>
              <Password
                id="newPassword"
                name="newPassword"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                toggleMask
                className="w-100"
                inputClassName="w-100 p-inputtext-lg"
                placeholder="••••••••"
                promptLabel="Elige una contraseña"
                weakLabel="Débil"
                mediumLabel="Media"
                strongLabel="Fuerte"
              />
            </div>

            <div className="d-flex gap-2">
              <Button
                type="button"
                label="Volver"
                severity="secondary"
                outlined
                className="w-50"
                onClick={() => { setStep(1); setResetToken(''); setMessage(''); setError(''); }}
              />
              <Button
                type="submit"
                label={isLoading ? "Restableciendo..." : "Restablecer"}
                icon={isLoading ? "pi pi-spin pi-spinner" : ""}
                disabled={isLoading}
                className="w-50 shadow"
              />
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
