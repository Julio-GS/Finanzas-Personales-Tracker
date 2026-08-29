import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDashboard, deleteTransaction, UnauthorizedError, DashboardFetchError } from '@/lib/dashboard';

describe('lib/dashboard API client', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches dashboard data without parameters and with year/month parameters', async () => {
    const mockData = { month: { year: 2026, month: 8, start: '2026-08-01', endExclusive: '2026-09-01' }, kpis: { income: '0.00', expenses: '0.00', investments: '0.00', netFlow: '0.00' }, breakdowns: { byEntity: [], byCategory: [] }, transactions: [] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => mockData });
    vi.stubGlobal('fetch', fetchMock);

    const res1 = await fetchDashboard();
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions', expect.any(Object));
    expect(res1).toEqual(mockData);

    await fetchDashboard(2025, 12);
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions?year=2025&month=12', expect.any(Object));
  });

  it('throws UnauthorizedError on 401 and DashboardFetchError on non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce({ ok: false, status: 500 }));
    await expect(fetchDashboard(2026, 8)).rejects.toThrow(UnauthorizedError);
    await expect(fetchDashboard(2026, 8)).rejects.toThrow(DashboardFetchError);
  });

  it('deletes transaction by id, throws on 401 or non-204 error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);

    await deleteTransaction('tx-1');
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/tx-1', { method: 'DELETE', headers: { Accept: 'application/json' } });

    await expect(deleteTransaction('tx-1')).rejects.toThrow(UnauthorizedError);
    await expect(deleteTransaction('tx-1')).rejects.toThrow(DashboardFetchError);
  });
});
