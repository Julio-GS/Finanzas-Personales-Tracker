import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';
import {
  insertTransaction,
  getMonthDashboard,
  deleteTransactionById,
  getHistoryReport,
} from '@/db/queries';
import { transactions } from '@/db/schema';

describe('Database Queries (db/queries.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertTransaction', () => {
    it('inserts a transaction and returns the created record with formatted amount', async () => {
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

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreated]),
          }),
        }),
      };

      const result = await insertTransaction(
        {
          type: 'expense',
          amount: '1250.50',
          bankEntity: 'Mercado Pago',
          category: 'Supermercado',
          date: '2026-08-26',
          description: 'Groceries',
        },
        mockDb as any
      );

      expect(mockDb.insert).toHaveBeenCalledWith(transactions);
      expect(result).toEqual(mockCreated);
    });

    it('trims strings and normalizes empty description to null', async () => {
      const mockCreated = {
        id: '22222222-2222-2222-2222-222222222222',
        createdAt: new Date(),
        date: '2026-08-26',
        type: 'income' as const,
        amount: '5000.00',
        bankEntity: 'Santander',
        category: 'Sueldo',
        description: null,
        rawAudioPrompt: null,
      };

      let insertedValues: any;
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((val) => {
            insertedValues = val;
            return {
              returning: vi.fn().mockResolvedValue([mockCreated]),
            };
          }),
        }),
      };

      await insertTransaction(
        {
          type: 'income',
          amount: 5000,
          bankEntity: '  Santander  ',
          category: '  Sueldo  ',
          date: '2026-08-26',
          description: '   ',
        },
        mockDb as any
      );

      expect(insertedValues.bankEntity).toBe('Santander');
      expect(insertedValues.category).toBe('Sueldo');
      expect(insertedValues.description).toBeNull();
      expect(insertedValues.amount).toBe('5000.00');
    });
  });

  describe('getMonthDashboard', () => {
    it('returns formatted KPIs, sorted breakdowns, and transaction list for a month with transactions', async () => {
      const mockTxs = [
        {
          id: '1',
          createdAt: new Date('2026-08-15T10:00:00Z'),
          date: '2026-08-15',
          type: 'income' as const,
          amount: '100000.00',
          bankEntity: 'Santander',
          category: 'Sueldo',
          description: 'Monthly salary',
          rawAudioPrompt: null,
        },
        {
          id: '2',
          createdAt: new Date('2026-08-16T11:00:00Z'),
          date: '2026-08-16',
          type: 'expense' as const,
          amount: '30000.00',
          bankEntity: 'Mercado Pago',
          category: 'Supermercado',
          description: null,
          rawAudioPrompt: null,
        },
        {
          id: '3',
          createdAt: new Date('2026-08-17T12:00:00Z'),
          date: '2026-08-17',
          type: 'investment' as const,
          amount: '20000.00',
          bankEntity: 'Santander',
          category: 'CEDEARs',
          description: 'AAPL purchase',
          rawAudioPrompt: null,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockTxs),
            }),
          }),
        }),
      };

      const result = await getMonthDashboard(2026, 8, mockDb as any);

      expect(result.month).toEqual({
        year: 2026,
        month: 8,
        start: '2026-08-01',
        endExclusive: '2026-09-01',
      });

      // KPIs: income=100000, expenses=30000, investments=20000 -> netFlow = 100000 - 30000 - 20000 = 50000
      expect(result.kpis).toEqual({
        income: '100000.00',
        expenses: '30000.00',
        investments: '20000.00',
        netFlow: '50000.00',
      });

      // Breakdowns by entity: Santander (100000+20000=120000), Mercado Pago (30000)
      expect(result.breakdowns.byEntity).toEqual([
        { label: 'Santander', total: '120000.00' },
        { label: 'Mercado Pago', total: '30000.00' },
      ]);

      // Breakdowns by category: Sueldo (100000), Supermercado (30000), CEDEARs (20000)
      expect(result.breakdowns.byCategory).toEqual([
        { label: 'Sueldo', total: '100000.00' },
        { label: 'Supermercado', total: '30000.00' },
        { label: 'CEDEARs', total: '20000.00' },
      ]);

      expect(result.transactions).toEqual(mockTxs);
    });

    it('returns zero KPIs and empty breakdowns/transactions for an empty month', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await getMonthDashboard(2026, 2, mockDb as any);

      expect(result.month).toEqual({
        year: 2026,
        month: 2,
        start: '2026-02-01',
        endExclusive: '2026-03-01',
      });

      expect(result.kpis).toEqual({
        income: '0.00',
        expenses: '0.00',
        investments: '0.00',
        netFlow: '0.00',
      });

      expect(result.breakdowns.byEntity).toEqual([]);
      expect(result.breakdowns.byCategory).toEqual([]);
      expect(result.transactions).toEqual([]);
    });

    it('sorts breakdowns with equal amounts alphabetically by label', async () => {
      const mockTxs = [
        {
          id: '1',
          createdAt: new Date('2026-08-15T10:00:00Z'),
          date: '2026-08-15',
          type: 'expense' as const,
          amount: '500.00',
          bankEntity: 'Santander',
          category: 'Zapatos',
          description: null,
          rawAudioPrompt: null,
        },
        {
          id: '2',
          createdAt: new Date('2026-08-16T11:00:00Z'),
          date: '2026-08-16',
          type: 'expense' as const,
          amount: '500.00',
          bankEntity: 'BBVA',
          category: 'Alimentos',
          description: null,
          rawAudioPrompt: null,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockTxs),
            }),
          }),
        }),
      };

      const result = await getMonthDashboard(2026, 8, mockDb as any);

      // BBVA before Santander (same amount, alphabetical label)
      expect(result.breakdowns.byEntity).toEqual([
        { label: 'BBVA', total: '500.00' },
        { label: 'Santander', total: '500.00' },
      ]);

      // Alimentos before Zapatos (same amount, alphabetical label)
      expect(result.breakdowns.byCategory).toEqual([
        { label: 'Alimentos', total: '500.00' },
        { label: 'Zapatos', total: '500.00' },
      ]);
    });

    it('accurately computes negative netFlow when expenses exceed income', async () => {
      const mockTxs = [
        {
          id: '1',
          createdAt: new Date('2026-08-01T10:00:00Z'),
          date: '2026-08-01',
          type: 'income' as const,
          amount: '1000.00',
          bankEntity: 'Efectivo',
          category: 'Venta',
          description: null,
          rawAudioPrompt: null,
        },
        {
          id: '2',
          createdAt: new Date('2026-08-02T10:00:00Z'),
          date: '2026-08-02',
          type: 'expense' as const,
          amount: '3500.75',
          bankEntity: 'Mercado Pago',
          category: 'Alquiler',
          description: null,
          rawAudioPrompt: null,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockTxs),
            }),
          }),
        }),
      };

      const result = await getMonthDashboard(2026, 8, mockDb as any);
      expect(result.kpis.income).toBe('1000.00');
      expect(result.kpis.expenses).toBe('3500.75');
      expect(result.kpis.investments).toBe('0.00');
      expect(result.kpis.netFlow).toBe('-2500.75');
    });

    it('passes exact month range [YYYY-12-01, YYYY+1-01-01) for December', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await getMonthDashboard(2026, 12, mockDb as any);
      expect(result.month).toEqual({
        year: 2026,
        month: 12,
        start: '2026-12-01',
        endExclusive: '2027-01-01',
      });
    });
  });

  describe('deleteTransactionById', () => {
    it('returns true when a row is deleted', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'uuid-1234' }]),
          }),
        }),
      };

      const result = await deleteTransactionById('uuid-1234', mockDb as any);
      expect(result).toBe(true);
    });

    it('returns false when no row was deleted (not found)', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const result = await deleteTransactionById('uuid-nonexistent', mockDb as any);
      expect(result).toBe(false);
    });
  });

  describe('getHistoryReport', () => {
    it('returns aggregated months in chronological order with netFlow calculation', async () => {
      const mockRows = [
        {
          monthKey: '2026-08',
          income: '100000.00',
          expenses: '30000.00',
          investments: '20000.00',
        },
        {
          monthKey: '2026-07',
          income: '80000.00',
          expenses: '25000.00',
          investments: '10000.00',
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockRows),
              }),
            }),
          }),
        }),
      };

      const result = await getHistoryReport(6, mockDb as any);

      // Should be returned chronologically: July 2026 then August 2026
      expect(result).toEqual([
        {
          year: 2026,
          month: 7,
          income: '80000.00',
          expenses: '25000.00',
          investments: '10000.00',
          netFlow: '45000.00', // 80000 - 25000 - 10000
        },
        {
          year: 2026,
          month: 8,
          income: '100000.00',
          expenses: '30000.00',
          investments: '20000.00',
          netFlow: '50000.00', // 100000 - 30000 - 20000
        },
      ]);
    });

    it('correctly sorts months across year boundaries (e.g. 2025-12 before 2026-01)', async () => {
      const mockRows = [
        {
          monthKey: '2026-01',
          income: '50000.00',
          expenses: '20000.00',
          investments: '0.00',
        },
        {
          monthKey: '2025-12',
          income: '45000.00',
          expenses: '15000.00',
          investments: '5000.00',
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockRows),
              }),
            }),
          }),
        }),
      };

      const result = await getHistoryReport(6, mockDb as any);
      expect(result[0].year).toBe(2025);
      expect(result[0].month).toBe(12);
      expect(result[0].netFlow).toBe('25000.00');

      expect(result[1].year).toBe(2026);
      expect(result[1].month).toBe(1);
      expect(result[1].netFlow).toBe('30000.00');
    });

    it('handles empty data by returning an empty array', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      };

      const result = await getHistoryReport(6, mockDb as any);
      expect(result).toEqual([]);
    });

    it('generates PostgreSQL-valid date grouping SQL without invalid substring on date column', async () => {
      const executedQueries: { query: string; params: unknown[] }[] = [];
      const mockNeon = vi.fn(async (query: string, params: unknown[]) => {
        executedQueries.push({ query, params });
        return { rows: [] };
      });
      const realDrizzleDb = drizzle(mockNeon as any, { schema });

      const result = await getHistoryReport(6, realDrizzleDb as any);

      // Verify execution succeeded and mapped empty rows to []
      expect(result).toEqual([]);
      expect(executedQueries.length).toBe(1);

      const sqlText = executedQueries[0].query;
      // Must NOT use substring (invalid on PostgreSQL date column)
      expect(sqlText).not.toMatch(/substring\s*\(/i);
      // Must use valid PostgreSQL date grouping expression (e.g. to_char on date column)
      expect(sqlText).toMatch(/to_char\s*\(\s*(?:"transactions"\.)?"date"\s*,\s*'YYYY-MM'\s*\)/i);
    });

    it('processes real Drizzle query result rows and correctly formats history KPIs', async () => {
      // Drizzle neon-http in arrayMode expects array rows in field order:
      // [monthKey, income, expenses, investments]
      const mockDbRows = [
        ['2026-08', '150000.00', '45000.00', '25000.00'],
        ['2026-07', '120000.00', '40000.00', '10000.00'],
      ];

      const executedQueries: { query: string; params: unknown[] }[] = [];
      const mockNeon = vi.fn(async (query: string, params: unknown[]) => {
        executedQueries.push({ query, params });
        return { rows: mockDbRows };
      });
      const realDrizzleDb = drizzle(mockNeon as any, { schema });

      const result = await getHistoryReport(6, realDrizzleDb as any);

      expect(result).toEqual([
        {
          year: 2026,
          month: 7,
          income: '120000.00',
          expenses: '40000.00',
          investments: '10000.00',
          netFlow: '70000.00',
        },
        {
          year: 2026,
          month: 8,
          income: '150000.00',
          expenses: '45000.00',
          investments: '25000.00',
          netFlow: '80000.00',
        },
      ]);
    });

    it('clamps limit between 1 and 12', async () => {
      let passedLimit: number | undefined;
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation((lim) => {
                  passedLimit = lim;
                  return Promise.resolve([]);
                }),
              }),
            }),
          }),
        }),
      };

      await getHistoryReport(20, mockDb as any);
      expect(passedLimit).toBe(12);

      await getHistoryReport(0, mockDb as any);
      expect(passedLimit).toBe(1);
    });
  });

  describe('Default DB client lazy resolution and fail-closed wiring', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.DATABASE_URL;
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('fails closed with a configuration error when default db is used without DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      await expect(
        insertTransaction({
          type: 'income',
          amount: 100,
          bankEntity: 'Bank',
          category: 'Cat',
          date: '2026-08-26',
        })
      ).rejects.toThrow(/DATABASE_URL.*required/i);

      await expect(getMonthDashboard(2026, 8)).rejects.toThrow(/DATABASE_URL.*required/i);
      await expect(deleteTransactionById('some-id')).rejects.toThrow(/DATABASE_URL.*required/i);
      await expect(getHistoryReport(6)).rejects.toThrow(/DATABASE_URL.*required/i);
    });
  });
});
