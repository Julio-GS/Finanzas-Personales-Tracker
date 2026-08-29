import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryTrend } from '@/components/dashboard/HistoryTrend';
import type { HistoryReportData } from '@/lib/types';

describe('HistoryTrend', () => {
  const mockHistoryData: HistoryReportData = {
    months: [
      { year: 2026, month: 3, income: '200000.00', expenses: '80000.00', investments: '40000.00', netFlow: '80000.00' },
      { year: 2026, month: 4, income: '220000.00', expenses: '90000.00', investments: '50000.00', netFlow: '80000.00' },
      { year: 2026, month: 5, income: '250000.00', expenses: '100000.00', investments: '50000.00', netFlow: '100000.00' },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { writable: true, value: { href: '', assign: vi.fn() } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders loading state initially and then shows chronological monthly trend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockHistoryData }));
    render(<HistoryTrend />);

    expect(screen.getByText(/evolución histórica/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/marzo 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/abril 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/mayo 2026/i)).toBeInTheDocument();
    });
  });

  it('handles empty history report gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ months: [] }) }));
    render(<HistoryTrend />);
    await waitFor(() => { expect(screen.getByText(/no hay datos históricos suficientes/i)).toBeInTheDocument(); });
  });

  it('handles fetch error and allows retry', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockHistoryData }));
    render(<HistoryTrend />);

    await waitFor(() => { expect(screen.getByRole('alert')).toBeInTheDocument(); });
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    await waitFor(() => { expect(screen.getByText(/marzo 2026/i)).toBeInTheDocument(); });
  });

  it('redirects to /login when receiving 401 unauthorized', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(<HistoryTrend />);
    await waitFor(() => { expect(window.location.href).toBe('/login'); });
  });

  it('renders correctly with gap months and displays positive vs deficit badges', async () => {
    const gapData: HistoryReportData = {
      months: [
        { year: 2026, month: 1, income: '100000.00', expenses: '120000.00', investments: '0.00', netFlow: '-20000.00' },
        { year: 2026, month: 6, income: '300000.00', expenses: '100000.00', investments: '50000.00', netFlow: '150000.00' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => gapData }));
    render(<HistoryTrend />);

    await waitFor(() => {
      expect(screen.getByText(/enero 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/junio 2026/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/déficit/i)).toBeInTheDocument();
    expect(screen.getByText(/neto \+/i)).toBeInTheDocument();
  });
});
