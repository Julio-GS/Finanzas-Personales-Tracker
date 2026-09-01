import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ManualTransactionForm,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from '@/components/transactions/ManualTransactionForm';

describe('ManualTransactionForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders all form fields with accessible labels and defaults, with a select for the 4 fixed accounts', () => {
    render(<ManualTransactionForm />);
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    
    const amountInput = screen.getByLabelText(/monto/i);
    expect(amountInput).toBeInTheDocument();
    expect(amountInput).toHaveAttribute('type', 'text');
    expect(amountInput).toHaveAttribute('inputMode', 'decimal');
    expect(amountInput).toHaveAttribute('placeholder', '$ 0,00');

    const accountSelect = screen.getByLabelText(/entidad \/ cuenta/i);
    expect(accountSelect).toBeInTheDocument();
    expect(accountSelect.tagName.toLowerCase()).toBe('select');

    const options = Array.from(accountSelect.querySelectorAll('option')).map((opt) => (opt as HTMLOptionElement).value);
    expect(options).toContain('Banco Galicia');
    expect(options).toContain('Mercado Pago');
    expect(options).toContain('Naranja X');
    expect(options).toContain('Efectivo');

    expect(screen.getByLabelText(/^categor[ií]a$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripci[oó]n/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar|registrar/i })).toBeInTheDocument();
  });

  it('submits valid form data and resets upon success', async () => {
    const user = userEvent.setup(), onSuccess = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 201, json: async () => ({ transaction: { id: '123', type: 'expense', amount: '1500.50', bankEntity: 'Mercado Pago', category: 'Supermercado', date: '2026-08-26', description: 'Compras' } }),
    });
    global.fetch = fetchMock;
    render(<ManualTransactionForm onSuccess={onSuccess} />);
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'expense');
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '1500.50');
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Mercado Pago');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Supermercado');
    await user.type(screen.getByLabelText(/descripci[oó]n/i), 'Compras');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/transactions', expect.objectContaining({
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: expect.stringContaining('"type":"expense"'),
      }));
    });
    const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(parsed.amount).toBe(1500.5); expect(parsed.bankEntity).toBe('Mercado Pago'); expect(parsed.category).toBe('Supermercado');
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.getByLabelText(/monto/i)).toHaveValue('');
    expect(screen.getByLabelText(/entidad \/ cuenta/i)).toHaveValue('');
  });

  it('validates invalid amount and prevents fetch submission', async () => {
    const user = userEvent.setup(), fetchMock = vi.fn(); global.fetch = fetchMock;
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '-50');
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Banco Galicia');
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
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Efectivo');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Comida');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/error de conexión/i));
  });

  it('displays validation error and remains usable on server 422', async () => {
    const user = userEvent.setup(), onSuccess = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: { code: 'validation_error', message: 'Datos de transacción inválidos' } }) });
    render(<ManualTransactionForm onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/monto/i), '500');
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Mercado Pago');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Servicios');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/inválidos/i));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 500');
  });

  it('redirects to /login when receiving 401 unauthorized', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'location', { writable: true, value: { href: '', assign: vi.fn() } });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'unauthorized', message: 'Unauthorized' } }) });
    render(<ManualTransactionForm />);
    await user.type(screen.getByLabelText(/monto/i), '100');
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Efectivo');
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
    await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Naranja X');
    await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Inversiones');
    await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));
    expect(screen.getByRole('button', { name: /guardando|registrando/i })).toBeDisabled();
    expect(screen.getByLabelText(/monto/i)).toBeDisabled();
    resolveFetch({ ok: true, status: 201, json: async () => ({ transaction: {} }) });
    await waitFor(() => expect(screen.getByRole('button', { name: /guardar|registrar/i })).not.toBeDisabled());
  });

  describe('Transfer Registration', () => {
    it('renders transfer option in type select and shows origin and destination selects when selected', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);

      const typeSelect = screen.getByLabelText(/tipo/i);
      expect(screen.getByRole('option', { name: /transferencia/i })).toBeInTheDocument();

      await user.selectOptions(typeSelect, 'transfer');

      expect(screen.getByLabelText(/cuenta.*origen|entidad \/ cuenta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cuenta.*destino/i)).toBeInTheDocument();
    });

    it('submits valid transfer with distinct accounts and resets form', async () => {
      const user = userEvent.setup(), onSuccess = vi.fn();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          transaction: {
            id: 'tx-transfer-1',
            type: 'transfer',
            amount: '5000.00',
            bankEntity: 'Banco Galicia',
            destinationBankEntity: 'Mercado Pago',
            category: 'Transferencia',
            date: '2026-08-26',
          },
        }),
      });
      global.fetch = fetchMock;

      render(<ManualTransactionForm onSuccess={onSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo/i), 'transfer');
      await user.type(screen.getByLabelText(/monto/i), '5000');
      await user.selectOptions(screen.getByLabelText(/cuenta.*origen|entidad \/ cuenta/i), 'Banco Galicia');
      await user.selectOptions(screen.getByLabelText(/cuenta.*destino/i), 'Mercado Pago');
      await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/transactions',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"type":"transfer"'),
          })
        );
      });

      const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(parsed.type).toBe('transfer');
      expect(parsed.amount).toBe(5000);
      expect(parsed.bankEntity).toBe('Banco Galicia');
      expect(parsed.destinationBankEntity).toBe('Mercado Pago');
      expect(parsed.category).toBe('Transferencia');

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(screen.getByRole('status')).toHaveTextContent(/registrada correctamente/i);
    });

    it('validates that source and destination accounts must be different', async () => {
      const user = userEvent.setup(), fetchMock = vi.fn();
      global.fetch = fetchMock;

      render(<ManualTransactionForm />);

      await user.selectOptions(screen.getByLabelText(/tipo/i), 'transfer');
      await user.type(screen.getByLabelText(/monto/i), '5000');
      await user.selectOptions(screen.getByLabelText(/cuenta.*origen|entidad \/ cuenta/i), 'Banco Galicia');
      await user.selectOptions(screen.getByLabelText(/cuenta.*destino/i), 'Banco Galicia');
      await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/distintas|diferentes/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('validates that destination account is required for transfer', async () => {
      const user = userEvent.setup(), fetchMock = vi.fn();
      global.fetch = fetchMock;

      render(<ManualTransactionForm />);

      await user.selectOptions(screen.getByLabelText(/tipo/i), 'transfer');
      await user.type(screen.getByLabelText(/monto/i), '5000');
      await user.selectOptions(screen.getByLabelText(/cuenta.*origen|entidad \/ cuenta/i), 'Banco Galicia');
      await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/destino.*requerida/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Currency Amount Input & Argentine Formatting', () => {
    it('formats amount in real-time with Argentine currency conventions ($ and thousands dots)', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);

      await user.type(amountInput, '1234567');
      expect(amountInput).toHaveValue('$ 1.234.567');
    });

    it('handles decimal entry with period and comma up to two decimals', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);

      await user.type(amountInput, '1500.50');
      expect(amountInput).toHaveValue('$ 1.500,50');

      await user.clear(amountInput);
      expect(amountInput).toHaveValue('');

      await user.type(amountInput, '2500,75');
      expect(amountInput).toHaveValue('$ 2.500,75');
    });

    it('handles typing cents directly starting with separator', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);

      await user.type(amountInput, '.50');
      expect(amountInput).toHaveValue('$ 0,50');
    });

    it('limits decimal places to 2 when extra digits are typed', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);

      await user.type(amountInput, '99.999');
      expect(amountInput).toHaveValue('$ 99,99');
    });

    it('predictably handles backspacing and clearing characters', async () => {
      const user = userEvent.setup();
      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);

      await user.type(amountInput, '1500.50');
      expect(amountInput).toHaveValue('$ 1.500,50');

      await user.type(amountInput, '{backspace}');
      expect(amountInput).toHaveValue('$ 1.500,5');

      await user.type(amountInput, '{backspace}');
      expect(amountInput).toHaveValue('$ 1.500,');

      await user.type(amountInput, '{backspace}');
      expect(amountInput).toHaveValue('$ 1.500');

      await user.type(amountInput, '{backspace}');
      expect(amountInput).toHaveValue('$ 150');

      await user.clear(amountInput);
      expect(amountInput).toHaveValue('');
    });

    it('rejects zero or empty amount on submission with accessible alert', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      render(<ManualTransactionForm />);
      const amountInput = screen.getByLabelText(/monto/i);
      await user.type(amountInput, '0');
      await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Mercado Pago');
      await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Test');
      await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/monto válido mayor a 0/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('submits income and investment transaction types with exact numeric payload', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ transaction: { id: 'tx-inv-1' } }),
      });
      global.fetch = fetchMock;

      render(<ManualTransactionForm defaultType="investment" />);
      const amountInput = screen.getByLabelText(/monto/i);
      await user.type(amountInput, '75000.25');
      await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Naranja X');
      await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'FCI');
      await user.click(screen.getByRole('button', { name: /guardar|registrar/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/transactions',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"amount":75000.25'),
          })
        );
      });
      const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(parsed.type).toBe('investment');
      expect(parsed.amount).toBe(75000.25);
    });
  });

  describe('formatCurrencyInput and parseCurrencyToNumber helpers', () => {
    it('formats numbers and handles leading zeros properly', () => {
      expect(formatCurrencyInput('007')).toBe('$ 7');
      expect(formatCurrencyInput('0')).toBe('$ 0');
      expect(formatCurrencyInput('0,')).toBe('$ 0,');
      expect(formatCurrencyInput('0,05')).toBe('$ 0,05');
      expect(formatCurrencyInput('10000000.99')).toBe('$ 10.000.000,99');
      expect(formatCurrencyInput('')).toBe('');
      expect(formatCurrencyInput('   ')).toBe('');
      expect(formatCurrencyInput('$')).toBe('');
    });

    it('parses formatted currency strings back to numeric floats', () => {
      expect(parseCurrencyToNumber('$ 1.500,50')).toBe(1500.5);
      expect(parseCurrencyToNumber('$ 10.000.000,99')).toBe(10000000.99);
      expect(parseCurrencyToNumber('$ 0,05')).toBe(0.05);
      expect(parseCurrencyToNumber('$ 0')).toBe(0);
      expect(parseCurrencyToNumber('-$ 50')).toBe(-50);
      expect(parseCurrencyToNumber('')).toBeNaN();
      expect(parseCurrencyToNumber('$')).toBeNaN();
    });
  });
});
