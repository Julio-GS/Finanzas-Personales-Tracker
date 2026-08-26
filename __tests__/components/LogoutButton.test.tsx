import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogoutButton } from '@/components/auth/LogoutButton';

describe('LogoutButton Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders logout button with accessible label', () => {
    render(<LogoutButton />);
    expect(screen.getByRole('button', { name: /cerrar sesión|logout/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/logout and redirects to /login on click', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: vi.fn() },
    });

    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: /cerrar sesión|logout/i });
    await user.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });

  it('disables button while logout is in-flight', async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(pendingPromise)
    );

    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: /cerrar sesión|logout/i });
    await user.click(button);

    expect(button).toBeDisabled();

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it('redirects to /login even if network call throws', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '', assign: vi.fn() },
    });

    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: /cerrar sesión|logout/i });
    await user.click(button);

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });
});
