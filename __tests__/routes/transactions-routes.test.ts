import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getTransactions, POST as postTransaction } from '@/app/api/transactions/route';
import { DELETE as deleteTransaction } from '@/app/api/transactions/[id]/route';
import { AUTH_COOKIE_NAME, createSessionToken } from '@/lib/auth-core';
import * as queries from '@/db/queries';

const TEST_SECRET = 'test_secret_for_auth_32_characters_long!';

async function makeAuthCookie(): Promise<string> {
  return await createSessionToken(TEST_SECRET, 604800);
}

describe('Transactions API Routes', () => {
  let validCookie: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_USERNAME', 'admin');
    vi.stubEnv('AUTH_PASSWORD', 'secret123');
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('NODE_ENV', 'test');
    validCookie = await makeAuthCookie();
  });

  describe('GET /api/transactions', () => {
    it('returns 401 JSON when unauthenticated (no cookie)', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions?year=2026&month=8');
      const res = await getTransactions(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 401 JSON when session cookie is invalid/tampered', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions?year=2026&month=8', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=invalid.tampered.token`,
        },
      });
      const res = await getTransactions(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 200 with monthly dashboard DTO when authenticated', async () => {
      const mockData = {
        month: {
          year: 2026,
          month: 8,
          start: '2026-08-01',
          endExclusive: '2026-09-01',
        },
        kpis: {
          income: '100000.00',
          expenses: '30000.00',
          investments: '20000.00',
          netFlow: '50000.00',
        },
        breakdowns: {
          byEntity: [{ label: 'Santander', total: '120000.00' }],
          byCategory: [{ label: 'Sueldo', total: '100000.00' }],
        },
        transactions: [],
      };

      vi.spyOn(queries, 'getMonthDashboard').mockResolvedValueOnce(mockData as any);

      const req = new NextRequest('http://localhost:3000/api/transactions?year=2026&month=8', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await getTransactions(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual(mockData);
      expect(queries.getMonthDashboard).toHaveBeenCalledWith(2026, 8);
    });

    it('defaults to current month when year/month are omitted', async () => {
      vi.spyOn(queries, 'getMonthDashboard').mockResolvedValueOnce({
        month: { year: 2026, month: 8, start: '2026-08-01', endExclusive: '2026-09-01' },
        kpis: { income: '0.00', expenses: '0.00', investments: '0.00', netFlow: '0.00' },
        breakdowns: { byEntity: [], byCategory: [] },
        transactions: [],
      } as any);

      const req = new NextRequest('http://localhost:3000/api/transactions', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await getTransactions(req);
      expect(res.status).toBe(200);
      expect(queries.getMonthDashboard).toHaveBeenCalledWith(undefined, undefined);
    });

    it('returns 422 for invalid month or year query parameters', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions?year=invalid&month=99', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await getTransactions(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
    });

    it('returns 500 database_error when query helper throws', async () => {
      vi.spyOn(queries, 'getMonthDashboard').mockRejectedValueOnce(new Error('DB connection lost'));

      const req = new NextRequest('http://localhost:3000/api/transactions?year=2026&month=8', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await getTransactions(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('database_error');
    });
  });

  describe('POST /api/transactions', () => {
    it('returns 401 JSON when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: 1500,
          bankEntity: 'Mercado Pago',
          category: 'Supermercado',
          date: '2026-08-26',
        }),
      });

      const res = await postTransaction(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 400 when body is invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: 'invalid-json{',
      });

      const res = await postTransaction(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('invalid_json');
    });

    it('validates input and returns 422 without calling DB when input is invalid', async () => {
      const insertSpy = vi.spyOn(queries, 'insertTransaction');

      const req = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: JSON.stringify({
          type: 'invalid_type',
          amount: -50,
          bankEntity: '',
          category: '',
          date: 'invalid-date',
        }),
      });

      const res = await postTransaction(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('creates a transaction and returns 201 with transaction object', async () => {
      const mockCreated = {
        id: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date('2026-08-26T12:00:00Z'),
        date: '2026-08-26',
        type: 'expense' as const,
        amount: '1250.50',
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        description: 'Groceries',
        rawAudioPrompt: null,
      };

      vi.spyOn(queries, 'insertTransaction').mockResolvedValueOnce(mockCreated as any);

      const req = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 1250.5,
          bankEntity: 'Mercado Pago',
          category: 'Supermercado',
          date: '2026-08-26',
          description: 'Groceries',
        }),
      });

      const res = await postTransaction(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.transaction).toEqual({
        ...mockCreated,
        createdAt: mockCreated.createdAt.toISOString(),
      });
    });

    it('returns 500 database_error when insert throws', async () => {
      vi.spyOn(queries, 'insertTransaction').mockRejectedValueOnce(new Error('DB failure'));

      const req = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 500,
          bankEntity: 'Efectivo',
          category: 'Café',
          date: '2026-08-26',
        }),
      });

      const res = await postTransaction(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('database_error');
    });
  });

  describe('DELETE /api/transactions/[id]', () => {
    it('returns 401 JSON when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions/11111111-1111-1111-1111-111111111111', {
        method: 'DELETE',
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 422 when ID is not a valid UUID', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions/not-a-valid-uuid', {
        method: 'DELETE',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: 'not-a-valid-uuid' }),
      });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
    });

    it('returns 404 not_found when transaction does not exist', async () => {
      vi.spyOn(queries, 'deleteTransactionById').mockResolvedValueOnce(false);

      const targetId = '22222222-2222-2222-2222-222222222222';
      const req = new NextRequest(`http://localhost:3000/api/transactions/${targetId}`, {
        method: 'DELETE',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: targetId }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('not_found');
    });

    it('accepts valid uppercase UUID on delete', async () => {
      vi.spyOn(queries, 'deleteTransactionById').mockResolvedValueOnce(true);

      const targetId = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'.toLowerCase(); // valid uuid
      const req = new NextRequest(`http://localhost:3000/api/transactions/${targetId}`, {
        method: 'DELETE',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: targetId }),
      });
      expect(res.status).toBe(204);
    });

    it('rejects an empty transaction ID on delete', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions/', {
        method: 'DELETE',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: '' }),
      });
      expect(res.status).toBe(422);
    });

    it('returns 500 database_error when delete throws', async () => {
      vi.spyOn(queries, 'deleteTransactionById').mockRejectedValueOnce(new Error('DB failure'));

      const targetId = '44444444-4444-4444-4444-444444444444';
      const req = new NextRequest(`http://localhost:3000/api/transactions/${targetId}`, {
        method: 'DELETE',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
      });

      const res = await deleteTransaction(req, {
        params: Promise.resolve({ id: targetId }),
      });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('database_error');
    });
  });
});
