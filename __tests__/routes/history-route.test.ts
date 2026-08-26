import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHistory } from '@/app/api/reports/history/route';
import { AUTH_COOKIE_NAME, createSessionToken } from '@/lib/auth-core';
import * as queries from '@/db/queries';

const TEST_SECRET = 'test_secret_for_auth_32_characters_long!';

async function makeAuthCookie(): Promise<string> {
  return await createSessionToken(TEST_SECRET, 604800);
}

describe('GET /api/reports/history', () => {
  let validCookie: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_USERNAME', 'admin');
    vi.stubEnv('AUTH_PASSWORD', 'secret123');
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('NODE_ENV', 'test');
    validCookie = await makeAuthCookie();
  });

  it('returns 401 JSON when unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/history');
    const res = await getHistory(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns 200 with chronological monthly history and default limit of 6', async () => {
    const mockMonths = [
      {
        year: 2026,
        month: 3,
        income: '90000.00',
        expenses: '25000.00',
        investments: '15000.00',
        netFlow: '50000.00',
      },
      {
        year: 2026,
        month: 4,
        income: '95000.00',
        expenses: '28000.00',
        investments: '15000.00',
        netFlow: '52000.00',
      },
    ];

    vi.spyOn(queries, 'getHistoryReport').mockResolvedValueOnce(mockMonths);

    const req = new NextRequest('http://localhost:3000/api/reports/history', {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
    });

    const res = await getHistory(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.months).toEqual(mockMonths);
    expect(queries.getHistoryReport).toHaveBeenCalledWith(6);
  });

  it('accepts a custom valid limit parameter (e.g. limit=12)', async () => {
    vi.spyOn(queries, 'getHistoryReport').mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/reports/history?limit=12', {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
    });

    const res = await getHistory(req);
    expect(res.status).toBe(200);
    expect(queries.getHistoryReport).toHaveBeenCalledWith(12);
  });

  it('returns 422 for invalid limit parameter (e.g. limit=0 or limit=15 or non-number)', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/reports/history?limit=0', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${validCookie}` },
    });
    const res1 = await getHistory(req1);
    expect(res1.status).toBe(422);

    const req2 = new NextRequest('http://localhost:3000/api/reports/history?limit=15', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${validCookie}` },
    });
    const res2 = await getHistory(req2);
    expect(res2.status).toBe(422);

    const req3 = new NextRequest('http://localhost:3000/api/reports/history?limit=abc', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${validCookie}` },
    });
    const res3 = await getHistory(req3);
    expect(res3.status).toBe(422);
  });

  it('returns 500 database_error when query helper throws', async () => {
    vi.spyOn(queries, 'getHistoryReport').mockRejectedValueOnce(new Error('DB failure'));

    const req = new NextRequest('http://localhost:3000/api/reports/history', {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
    });

    const res = await getHistory(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('database_error');
  });
});
