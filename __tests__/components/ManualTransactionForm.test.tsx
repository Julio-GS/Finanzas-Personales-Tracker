import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualTransactionForm } from '@/components/transactions/ManualTransactionForm';

describe('ManualTransactionForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders all form fields with accessible labels and defaults', () => {
    render(<ManualTransactionForm />);
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/entidad \/ cuenta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^categor[ií]a$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripci[oó]n/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar|registrar/i })).toBeInTheDocument();
  });

  it('submits valid form data and resets upon success', async () => {
    const user = userEvent.setup(), onSuccess = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201, json: async () => ({ transaction: { id: '123', type: 'expense', amount: '1500.50', bankEntity: 'Santander', category: 'Supermercado', date: '2026-08-26', description: 'Compras' } }),
    });
    global.fetch = fetchMock;
    render(<ManualTransactionForm onSuccess={onSuccess} />);
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'expense');
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '1500.50');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Santander');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Supermercado');
    await user.type(screen.getByLabelText(/descripci[oó]n/i), 'Compras');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/transactions', expect.objectContaining({
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: expect.stringContaining('"type":"expense"'),
      }));
    });
    const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(parsed.amount).toBe(1500.5); expect(parsed.bankEntity).toBe('Santander'); expect(parsed.category).toBe('Supermercado');
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.getByLabelText(/monto/i)).toHaveValue(null);
    expect(screen.getByLabelText(/entidad \/ cuenta/i)).toHaveValue('');
  });

  it('validates invalid amount and prevents fetch submission', async () => {
    const user = userEvent.setup(), fetchMock = vi.fn(); global.fetch = fetchMock;
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '-50');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Santander');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Super');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/monto válido mayor a 0/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates missing bank entity or category and prevents fetch submission', async () => {
    const user = userEvent.setup(), fetchMock = vi.fn(); global.fetch = fetchMock;
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '100');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Super');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/entidad o cuenta es requerida/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles network error on submission gracefully', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '100');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Efectivo');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Comida');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/error de conexión/i));
  });

  it('displays validation error and remains usable on server 422', async () => {
    const user = userEvent.setup(), onSuccess = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: { code: 'validation_error', message: 'Datos de transacción inválidos' } }) });
    render(<ManualTransactionForm onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/monto/i), '500');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Mercado Pago');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Servicios');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/inválidos/i));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/monto/i)).toHaveValue(500);
  });

  it('redirects to /login when receiving 401 unauthorized', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'location', { writable: true, value: { href: '', assign: vi.fn() } });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'unauthorized', message: 'Unauthorized' } }) });
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '100');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Efectivo');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Salidas');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });

  it('disables controls while submitting', async () => {
    const user = userEvent.setup();
    let resolveFetch!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '250');
    await user.type(screen.getByLabelText(/entidad \/ cuenta/i), 'Lemon');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Inversiones');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    expect(screen.getByRole('button', { name: /guardando|registrando/i })).toBeDisabled();
    expect(screen.getByLabelText(/monto/i)).toBeDisabled();
    resolveFetch({ ok: true, status: 201, json: async () => ({ transaction: {} }) });
    await waitFor(() => expect(screen.getByRole('button', { name: /guardar|registrar/i })).not.toBeDisabled());
  });
});
