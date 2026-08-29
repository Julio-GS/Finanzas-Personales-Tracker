import type { MonthDashboardData, HistoryReportData } from './types';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class DashboardFetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'DashboardFetchError';
  }
}

export async function fetchDashboard(year?: number, month?: number): Promise<MonthDashboardData> {
  const params = new URLSearchParams();
  if (year !== undefined && !Number.isNaN(year)) params.set('year', String(year));
  if (month !== undefined && !Number.isNaN(month)) params.set('month', String(month));
  const qs = params.toString();
  const res = await fetch(`/api/transactions${qs ? `?${qs}` : ''}`, { method: 'GET', headers: { Accept: 'application/json' } });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new DashboardFetchError(`Fetch failed: ${res.status}`, res.status);
  return res.json();
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok && res.status !== 204) throw new DashboardFetchError(`Delete failed: ${res.status}`, res.status);
}

export async function fetchHistory(limit = 6): Promise<HistoryReportData> {
  const res = await fetch(`/api/reports/history?limit=${encodeURIComponent(String(limit))}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new DashboardFetchError(`History fetch failed: ${res.status}`, res.status);
  return res.json();
}

