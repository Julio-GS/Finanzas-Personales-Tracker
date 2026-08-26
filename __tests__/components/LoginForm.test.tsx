import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders username and password inputs and submit button with accessible labels', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar|iniciar sesión/i })).toBeInTheDocument();
  });

  it('submits credentials to /api/auth/login and redirects on success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: vi.fn() },
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /ingresar|iniciar sesión/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'secret123' }),
      });
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/');
    });
  });

  it('displays generic error alert on 401 response without leaking details', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'invalid_credentials', message: 'Invalid credentials' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /ingresar|iniciar sesión/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/credenciales inválidas|invalid credentials/i);
    });
  });

  it('disables submit button and shows loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(pendingPromise)
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'pass');
    const submitBtn = screen.getByRole('button', { name: /ingresar|iniciar sesión/i });
    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/ingresando/i)).toBeInTheDocument();

    // Resolve promise and await flush
    resolveFetch({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'invalid_credentials', message: 'Invalid credentials' } }),
    });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('displays connection error message when network request throws', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'pass');
    await user.click(screen.getByRole('button', { name: /ingresar|iniciar sesión/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/error de conexión|inténtelo nuevamente/i);
    });
  });
});
