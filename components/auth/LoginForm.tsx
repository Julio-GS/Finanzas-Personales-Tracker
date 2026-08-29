'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm(): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        window.location.href = '/';
        return;
      }

      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        setError('Credenciales inválidas');
      } else if (data?.error?.message) {
        setError(data.error.message);
      } else {
        setError('Error al iniciar sesión. Inténtelo nuevamente.');
      }
    } catch {
      setError('Error de conexión. Inténtelo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/25"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ingrese su usuario"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading}>
        {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
