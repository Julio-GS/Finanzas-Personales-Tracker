import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthNavigator } from '@/components/dashboard/MonthNavigator';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { BreakdownList } from '@/components/dashboard/BreakdownList';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import type { MonthDashboardData } from '@/lib/types';

describe('Dashboard UI Components', () => {
  describe('MonthNavigator', () => {
    it('renders month name and handles prev/next/current clicks', async () => {
      const user = userEvent.setup(), onPrev = vi.fn(), onNext = vi.fn(), onCurr = vi.fn();
      const { rerender } = render(<MonthNavigator year={2026} month={8} onPrevious={onPrev} onNext={onNext} onCurrentMonth={onCurr} isCurrentMonth={false} />);
      expect(screen.getByText(/agosto 2026/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /mes anterior/i }));
      await user.click(screen.getByRole('button', { name: /mes siguiente/i }));
      await user.click(screen.getByRole('button', { name: /mes actual/i }));
      expect(onPrev).toHaveBeenCalledTimes(1);
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(onCurr).toHaveBeenCalledTimes(1);
      rerender(<MonthNavigator year={2026} month={8} onPrevious={onPrev} onNext={onNext} onCurrentMonth={onCurr} isCurrentMonth={true} disabled={true} />);
      expect(screen.getByRole('button', { name: /mes actual/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /mes anterior/i })).toBeDisabled();
    });
  });

  describe('KpiCards', () => {
    it('renders formatted KPIs, positive flow, zero states, negative deficit, and cumulative investments', () => {
      const { rerender } = render(
        <KpiCards
          kpis={{
            income: '250000.00',
            expenses: '80000.00',
            investments: '50000.00',
            netFlow: '120000.00',
            cumulativeInvestments: '175000.00',
          }}
        />
      );
      expect(screen.getByText(/^ingresos$/i)).toBeInTheDocument();
      expect(screen.getByText(/positivo/i)).toBeInTheDocument();
      expect(screen.getByText(/\$ 250\.000,00|\$250,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/inversi[oó]n acumulada/i)).toBeInTheDocument();
      expect(screen.getByText(/\$ 175\.000,00|\$175,000\.00/i)).toBeInTheDocument();

      rerender(
        <KpiCards
          kpis={{
            income: '0.00',
            expenses: '0.00',
            investments: '0.00',
            netFlow: '0.00',
            cumulativeInvestments: '0.00',
          }}
        />
      );
      expect(screen.getAllByText(/\$ 0,00|\$0\.00/i).length).toBe(5);

      rerender(
        <KpiCards
          kpis={{
            income: '50000.00',
            expenses: '80000.00',
            investments: '0.00',
            netFlow: '-30000.00',
          }}
        />
      );
      expect(screen.getByText(/déficit/i)).toBeInTheDocument();
    });

    it('shows only strictly positive accounts with formatted values under Flujo Neto and hides zero/negative accounts', () => {
      const byEntity = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '100000.00',
          expenses: '30000.00',
          investments: '0.00',
          net: '70000.00',
          total: '130000.00',
        },
        {
          account: 'Naranja X',
          label: 'Naranja X',
          income: '15000.00',
          expenses: '10000.00',
          investments: '0.00',
          net: '5000.00',
          total: '25000.00',
        },
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '20000.00',
          expenses: '25000.00',
          investments: '0.00',
          net: '-5000.00',
          total: '45000.00',
        },
        {
          account: 'Efectivo',
          label: 'Efectivo',
          income: '0.00',
          expenses: '0.00',
          investments: '0.00',
          net: '0.00',
          total: '0.00',
        },
      ];

      render(
        <KpiCards
          kpis={{
            income: '135000.00',
            expenses: '60000.00',
            investments: '0.00',
            netFlow: '75000.00',
          }}
          byEntity={byEntity}
        />
      );

      // Global net remains visible
      expect(screen.getByText(/\$ 75\.000,00|\$75,000\.00/i)).toBeInTheDocument();

      // Strictly positive accounts appear
      expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
      expect(screen.getByText(/\$ 70\.000,00|\$70,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText('Naranja X')).toBeInTheDocument();
      expect(screen.getByText(/\$ 5\.000,00|\$5,000\.00/i)).toBeInTheDocument();

      // Negative and zero accounts are hidden
      expect(screen.queryByText('Mercado Pago')).not.toBeInTheDocument();
      expect(screen.queryByText('Efectivo')).not.toBeInTheDocument();
    });

    it('renders honest empty state under Flujo Neto when no accounts have positive net', () => {
      const byEntity = [
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '20000.00',
          expenses: '25000.00',
          investments: '0.00',
          net: '-5000.00',
          total: '45000.00',
        },
        {
          account: 'Efectivo',
          label: 'Efectivo',
          income: '0.00',
          expenses: '0.00',
          investments: '0.00',
          net: '0.00',
          total: '0.00',
        },
      ];

      const { rerender } = render(
        <KpiCards
          kpis={{
            income: '20000.00',
            expenses: '25000.00',
            investments: '0.00',
            netFlow: '-5000.00',
          }}
          byEntity={byEntity}
        />
      );

      expect(screen.getByText(/sin remanente en cuentas/i)).toBeInTheDocument();
      expect(screen.queryByText('Mercado Pago')).not.toBeInTheDocument();
      expect(screen.queryByText('Efectivo')).not.toBeInTheDocument();

      rerender(
        <KpiCards
          kpis={{
            income: '0.00',
            expenses: '0.00',
            investments: '0.00',
            netFlow: '0.00',
          }}
          byEntity={[]}
        />
      );
      expect(screen.getByText(/sin remanente en cuentas/i)).toBeInTheDocument();
    });

    it('shows positive account row even when overall monthly net is in deficit, and handles loading state', () => {
      const byEntity = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '50000.00',
          expenses: '30000.00',
          investments: '0.00',
          net: '20000.00',
          total: '80000.00',
        },
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '10000.00',
          expenses: '40000.00',
          investments: '0.00',
          net: '-30000.00',
          total: '50000.00',
        },
      ];

      const { rerender } = render(
        <KpiCards
          kpis={{
            income: '60000.00',
            expenses: '70000.00',
            investments: '0.00',
            netFlow: '-10000.00',
          }}
          byEntity={byEntity}
        />
      );

      // Global deficit is visible
      expect(screen.getByText(/déficit/i)).toBeInTheDocument();
      expect(screen.getByText(/-\$ 10\.000,00|-\$10,000\.00/i)).toBeInTheDocument();

      // Only positive account appears
      expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
      expect(screen.getByText(/\$ 20\.000,00|\$20,000\.00/i)).toBeInTheDocument();
      expect(screen.queryByText('Mercado Pago')).not.toBeInTheDocument();

      // Loading state
      rerender(
        <KpiCards
          kpis={{
            income: '60000.00',
            expenses: '70000.00',
            investments: '0.00',
            netFlow: '-10000.00',
          }}
          byEntity={byEntity}
          loading={true}
        />
      );
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('correctly updates positive-account list when 1,377,000 investment reduces or removes funding bank', () => {
      // Case A: Investment pushes Banco Galicia into deficit (net = -77,000.00)
      const byEntityDeficit = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '1500000.00',
          expenses: '200000.00',
          investments: '1377000.00',
          net: '-77000.00',
          total: '3077000.00',
        },
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '50000.00',
          expenses: '20000.00',
          investments: '0.00',
          net: '30000.00',
          total: '70000.00',
        },
      ];

      const { rerender } = render(
        <KpiCards
          kpis={{
            income: '1550000.00',
            expenses: '220000.00',
            investments: '1377000.00',
            netFlow: '-47000.00',
            cumulativeInvestments: '1377000.00',
          }}
          byEntity={byEntityDeficit}
        />
      );

      // Galicia has negative net (-77,000) so it must NOT appear in positive accounts
      expect(screen.queryByText('Banco Galicia')).not.toBeInTheDocument();
      // Mercado Pago has positive net (30,000) so it MUST appear
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
      expect(screen.getByText(/\$ 30\.000,00|\$30,000\.00/i)).toBeInTheDocument();

      // Case B: Investment leaves Banco Galicia with reduced positive net (2,000,000 - 200,000 - 1,377,000 = +423,000.00)
      const byEntityPositive = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '2000000.00',
          expenses: '200000.00',
          investments: '1377000.00',
          net: '423000.00',
          total: '3577000.00',
        },
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '50000.00',
          expenses: '20000.00',
          investments: '0.00',
          net: '30000.00',
          total: '70000.00',
        },
      ];

      rerender(
        <KpiCards
          kpis={{
            income: '2050000.00',
            expenses: '220000.00',
            investments: '1377000.00',
            netFlow: '453000.00',
            cumulativeInvestments: '1377000.00',
          }}
          byEntity={byEntityPositive}
        />
      );

      // Both accounts appear in positive list with exact reduced net
      expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
      expect(screen.getByText(/\$ 423\.000,00|\$423,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
      expect(screen.getByText(/\$ 30\.000,00|\$30,000\.00/i)).toBeInTheDocument();
    });
  });

  describe('BreakdownList', () => {
    it('renders account breakdown showing monthly income, expenses, and net per account', () => {
      const accounts = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '100000.00',
          expenses: '30000.00',
          investments: '0.00',
          net: '70000.00',
          total: '130000.00',
        },
        {
          account: 'Mercado Pago',
          label: 'Mercado Pago',
          income: '20000.00',
          expenses: '25000.00',
          investments: '0.00',
          net: '-5000.00',
          total: '45000.00',
        },
      ];
      const categories = [{ label: 'Supermercado', total: '25000.00' }];

      const { rerender } = render(
        <BreakdownList byEntity={accounts} byCategory={categories} />
      );
      expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
      expect(screen.getByText('Supermercado')).toBeInTheDocument();
      expect(screen.getAllByText(/ingresos:/i).length).toBe(2);
      expect(screen.getAllByText(/gastos:/i).length).toBe(2);
      expect(screen.getAllByText(/neto:/i).length).toBe(2);

      rerender(<BreakdownList byEntity={[]} byCategory={[]} />);
      expect(screen.getAllByText(/sin movimientos en este período/i).length).toBe(2);
    });

    it('renders separate Ingresos, Gastos, and Inversión labels and negative net for account with 1,377,000 investment', () => {
      const accounts = [
        {
          account: 'Banco Galicia',
          label: 'Banco Galicia',
          income: '1500000.00',
          expenses: '200000.00',
          investments: '1377000.00',
          net: '-77000.00',
          total: '3077000.00',
        },
      ];

      render(<BreakdownList byEntity={accounts} byCategory={[]} />);

      expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
      expect(screen.getByText(/ingresos:/i)).toBeInTheDocument();
      expect(screen.getByText(/\+\$ 1\.500\.000,00|\+\$1,500,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/gastos:/i)).toBeInTheDocument();
      expect(screen.getByText(/-\$ 200\.000,00|-\$200,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/inversión \(movimiento\):/i)).toBeInTheDocument();
      expect(screen.getByText(/★ \$ 1\.377\.000,00|★ \$1,377,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/neto:/i)).toBeInTheDocument();
      expect(screen.getByText(/-\$ 77\.000,00|-\$77,000\.00/i)).toBeInTheDocument();
    });
  });

  describe('TransactionList', () => {
    const txs = [
      { id: 'tx-1', createdAt: '2026-08-26', date: '2026-08-26', type: 'expense' as const, amount: '1250.50', bankEntity: 'MP', category: 'Super', description: 'Semanal', rawAudioPrompt: null },
      { id: 'tx-2', createdAt: '2026-08-25', date: '2026-08-25', type: 'income' as const, amount: '50000.00', bankEntity: 'Santander', category: 'Honorarios', description: null, rawAudioPrompt: 'Nota' },
      { id: 'tx-3', createdAt: '2026-08-24', date: '2026-08-24', type: 'investment' as const, amount: '20000.00', bankEntity: 'Lemon', category: 'CEDEARs', description: 'SPY', rawAudioPrompt: null },
    ];

    it('renders badges, text cues, raw prompt, handles delete and empty state', async () => {
      const user = userEvent.setup(), onDelete = vi.fn();
      const { rerender } = render(<TransactionList transactions={txs} onDelete={onDelete} deletingId="tx-2" />);
      expect(screen.getByText('Semanal')).toBeInTheDocument();
      expect(screen.getByText(/gasto/i)).toBeInTheDocument();
      expect(screen.getByText(/ingreso/i)).toBeInTheDocument();
      expect(screen.getByText(/inversión/i)).toBeInTheDocument();
      expect(screen.getByText(/“Nota”/i)).toBeInTheDocument();
      const deleteBtns = screen.getAllByRole('button', { name: /eliminar transacción/i });
      expect(deleteBtns[1]).toBeDisabled();
      await user.click(deleteBtns[0]);
      expect(onDelete).toHaveBeenCalledWith('tx-1');
      rerender(<TransactionList transactions={[]} />);
      expect(screen.getByText(/no hay transacciones registradas este mes/i)).toBeInTheDocument();
    });
  });

  describe('DashboardClient', () => {
    const mockData: MonthDashboardData = {
      month: { year: 2026, month: 8, start: '2026-08-01', endExclusive: '2026-09-01' },
      kpis: { income: '300000.00', expenses: '100000.00', investments: '50000.00', netFlow: '150000.00' },
      breakdowns: { byEntity: [{ label: 'Santander', total: '300000.00' }], byCategory: [{ label: 'Salario', total: '300000.00' }] },
      transactions: [{ id: 'tx-100', createdAt: '2026-08-15', date: '2026-08-15', type: 'income', amount: '300000.00', bankEntity: 'Santander', category: 'Salario', description: 'Sueldo', rawAudioPrompt: null }],
    };

    beforeEach(() => {
      vi.restoreAllMocks();
      Object.defineProperty(window, 'location', { writable: true, value: { href: '', assign: vi.fn() } });
    });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('fetches on mount, navigates months with year rollovers, and redirects on 401', async () => {
      const user = userEvent.setup();
      const txResponses = [
        { ok: true, status: 200, json: async () => mockData },
        { ok: true, status: 200, json: async () => ({ ...mockData, month: { year: 2026, month: 7 } }) },
      ];
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/reports/history')) {
          return { ok: true, status: 200, json: async () => ({ months: [] }) };
        }
        return txResponses.shift() ?? { ok: true, status: 200, json: async () => mockData };
      }));

      const { unmount } = render(<DashboardClient initialYear={2026} initialMonth={8} />);
      await waitFor(() => { expect(screen.getByText('Sueldo')).toBeInTheDocument(); });
      await user.click(screen.getByRole('button', { name: /mes anterior/i }));
      await waitFor(() => { expect(screen.getByText(/julio 2026/i)).toBeInTheDocument(); });
      unmount();

      const rollResponses = [
        { ok: true, status: 200, json: async () => ({ ...mockData, month: { year: 2026, month: 1 } }) },
        { ok: true, status: 200, json: async () => ({ ...mockData, month: { year: 2025, month: 12 } }) },
      ];
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/reports/history')) {
          return { ok: true, status: 200, json: async () => ({ months: [] }) };
        }
        return rollResponses.shift() ?? { ok: true, status: 200, json: async () => mockData };
      }));

      render(<DashboardClient initialYear={2026} initialMonth={1} />);
      await waitFor(() => { expect(screen.getByText(/enero 2026/i)).toBeInTheDocument(); });
      await user.click(screen.getByRole('button', { name: /mes anterior/i }));
      await waitFor(() => { expect(screen.getByText(/diciembre 2025/i)).toBeInTheDocument(); });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
      render(<DashboardClient initialYear={2026} initialMonth={8} />);
      await waitFor(() => { expect(window.location.href).toBe('/login'); });
    });

    it('handles delete transaction, error banner with retry, and delete error', async () => {
      const user = userEvent.setup();
      const txResponses = [
        { ok: true, status: 200, json: async () => mockData },
        { ok: true, status: 204 },
        { ok: true, status: 200, json: async () => ({ ...mockData, transactions: [] }) },
      ];
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/reports/history')) {
          return { ok: true, status: 200, json: async () => ({ months: [] }) };
        }
        return txResponses.shift() ?? { ok: true, status: 200, json: async () => mockData };
      }));

      render(<DashboardClient initialYear={2026} initialMonth={8} />);
      await waitFor(() => { expect(screen.getByText('Sueldo')).toBeInTheDocument(); });
      await user.click(screen.getByRole('button', { name: /eliminar transacción/i }));
      await waitFor(() => { expect(screen.getByText(/no hay transacciones registradas este mes/i)).toBeInTheDocument(); });

      const retryResponses = [
        { ok: false, status: 500 },
        { ok: true, status: 200, json: async () => mockData },
      ];
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/reports/history')) {
          return { ok: true, status: 200, json: async () => ({ months: [] }) };
        }
        return retryResponses.shift() ?? { ok: true, status: 200, json: async () => mockData };
      }));

      render(<DashboardClient initialYear={2026} initialMonth={8} />);
      await waitFor(() => { expect(screen.getByRole('alert')).toBeInTheDocument(); });
      await user.click(screen.getByRole('button', { name: /reintentar/i }));
      await waitFor(() => { expect(screen.getByText('Sueldo')).toBeInTheDocument(); });
    });

    it('renders transaction creation forms and refetches dashboard on transaction save', async () => {
      const user = userEvent.setup(), newTx = { id: 'tx-new', createdAt: '2026-08-26', date: '2026-08-26', type: 'expense' as const, amount: '500.00', bankEntity: 'Mercado Pago', category: 'Cena', description: null, rawAudioPrompt: null };
      const updatedMockData: MonthDashboardData = { ...mockData, transactions: [newTx, ...mockData.transactions] };
      const txResponses = [
        { ok: true, status: 200, json: async () => mockData },
        { ok: true, status: 201, json: async () => ({ transaction: newTx }) },
        { ok: true, status: 200, json: async () => updatedMockData },
      ];
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/api/reports/history')) {
          return { ok: true, status: 200, json: async () => ({ months: [] }) };
        }
        return txResponses.shift() ?? { ok: true, status: 200, json: async () => mockData };
      }));

      render(<DashboardClient initialYear={2026} initialMonth={8} />);
      await waitFor(() => { expect(screen.getByText('Sueldo')).toBeInTheDocument(); });
      expect(screen.getByRole('button', { name: /guardar transacción/i })).not.toBeDisabled();
      await user.type(screen.getByLabelText(/monto/i), '500.00');
      await user.selectOptions(screen.getByLabelText(/entidad \/ cuenta/i), 'Mercado Pago');
      await user.type(screen.getByLabelText(/^categor[ií]a$/i), 'Cena');
      await user.click(screen.getByRole('button', { name: /guardar transacción/i }));
      await waitFor(() => { expect(screen.getByText('Cena')).toBeInTheDocument(); });
    });
  });
});
