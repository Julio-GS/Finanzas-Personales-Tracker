import { describe, it, expect } from 'vitest';
import {
  movementTypeSchema,
  manualTransactionInputSchema,
  audioTransactionInputSchema,
  geminiExtractedTransactionSchema,
  monthQuerySchema,
  historyQuerySchema,
  apiErrorSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('movementTypeSchema', () => {
    it('accepts income, expense, and investment', () => {
      expect(movementTypeSchema.parse('income')).toBe('income');
      expect(movementTypeSchema.parse('expense')).toBe('expense');
      expect(movementTypeSchema.parse('investment')).toBe('investment');
    });

    it('rejects invalid movement types', () => {
      expect(() => movementTypeSchema.parse('other')).toThrow();
      expect(() => movementTypeSchema.parse('')).toThrow();
      expect(() => movementTypeSchema.parse(123)).toThrow();
    });
  });

  describe('manualTransactionInputSchema', () => {
    it('accepts a valid manual transaction with number amount', () => {
      const result = manualTransactionInputSchema.parse({
        type: 'expense',
        amount: 1500.5,
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        date: '2026-08-26',
        description: 'Compras semanales',
      });

      expect(result.type).toBe('expense');
      expect(result.amount).toBe('1500.50');
      expect(result.bankEntity).toBe('Mercado Pago');
      expect(result.category).toBe('Supermercado');
      expect(result.date).toBe('2026-08-26');
      expect(result.description).toBe('Compras semanales');
    });

    it('accepts string amount and normalizes to 2 decimal places', () => {
      const result = manualTransactionInputSchema.parse({
        type: 'income',
        amount: '250000',
        bankEntity: 'Santander',
        category: 'Sueldo',
        date: '2026-08-01',
      });

      expect(result.amount).toBe('250000.00');
    });

    it('transforms empty string description or missing description to null', () => {
      const res1 = manualTransactionInputSchema.parse({
        type: 'expense',
        amount: 500,
        bankEntity: 'Efectivo',
        category: 'Transporte',
        date: '2026-08-26',
        description: '',
      });
      expect(res1.description).toBeNull();

      const res2 = manualTransactionInputSchema.parse({
        type: 'expense',
        amount: 500,
        bankEntity: 'Efectivo',
        category: 'Transporte',
        date: '2026-08-26',
      });
      expect(res2.description).toBeNull();
    });

    it('rejects invalid amounts (negative, zero, more than 2 decimal places, NaN)', () => {
      const base = {
        type: 'expense' as const,
        bankEntity: 'Santander',
        category: 'Comida',
        date: '2026-08-26',
      };

      expect(() => manualTransactionInputSchema.parse({ ...base, amount: -50 })).toThrow();
      expect(() => manualTransactionInputSchema.parse({ ...base, amount: 0 })).toThrow();
      expect(() => manualTransactionInputSchema.parse({ ...base, amount: '12.345' })).toThrow();
      expect(() => manualTransactionInputSchema.parse({ ...base, amount: 'abc' })).toThrow();
    });

    it('rejects empty or whitespace-only bankEntity or category', () => {
      const base = {
        type: 'expense' as const,
        amount: 100,
        date: '2026-08-26',
      };

      expect(() =>
        manualTransactionInputSchema.parse({ ...base, bankEntity: '  ', category: 'Comida' })
      ).toThrow();
      expect(() =>
        manualTransactionInputSchema.parse({ ...base, bankEntity: 'Santander', category: '' })
      ).toThrow();
    });

    it('rejects invalid date formats', () => {
      const base = {
        type: 'expense' as const,
        amount: 100,
        bankEntity: 'Santander',
        category: 'Comida',
      };

      expect(() => manualTransactionInputSchema.parse({ ...base, date: '26/08/2026' })).toThrow();
      expect(() => manualTransactionInputSchema.parse({ ...base, date: 'not-a-date' })).toThrow();
      expect(() => manualTransactionInputSchema.parse({ ...base, date: '2026-13-45' })).toThrow();
    });
  });

  describe('audioTransactionInputSchema', () => {
    it('accepts valid audio base64 and supported mimeType', () => {
      const validMimes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/m4a',
        'audio/ogg',
      ];

      for (const mimeType of validMimes) {
        const result = audioTransactionInputSchema.parse({
          audio: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
          mimeType,
        });
        expect(result.mimeType).toBe(mimeType);
        expect(result.audio).toBeDefined();
      }
    });

    it('rejects empty audio or unsupported mime types', () => {
      expect(() =>
        audioTransactionInputSchema.parse({
          audio: '',
          mimeType: 'audio/webm',
        })
      ).toThrow();

      expect(() =>
        audioTransactionInputSchema.parse({
          audio: 'validbase64',
          mimeType: 'video/mp4',
        })
      ).toThrow();

      expect(() =>
        audioTransactionInputSchema.parse({
          audio: 'validbase64',
          mimeType: 'application/json',
        })
      ).toThrow();
    });
  });

  describe('geminiExtractedTransactionSchema', () => {
    it('accepts extracted transaction with all fields', () => {
      const result = geminiExtractedTransactionSchema.parse({
        type: 'expense',
        amount: 4500.5,
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        date: '2026-08-26',
        description: 'Gasto en verdulería',
        rawAudioPrompt: 'Gasté 4500 en la verdulería con Mercado Pago',
      });

      expect(result.type).toBe('expense');
      expect(result.amount).toBe('4500.50');
      expect(result.bankEntity).toBe('Mercado Pago');
      expect(result.category).toBe('Supermercado');
      expect(result.rawAudioPrompt).toBe('Gasté 4500 en la verdulería con Mercado Pago');
    });

    it('defaults bankEntity to Efectivo and date to provided or current date when absent', () => {
      const result = geminiExtractedTransactionSchema.parse({
        type: 'income',
        amount: 10000,
        category: 'Venta',
      });

      expect(result.bankEntity).toBe('Efectivo');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.description).toBeNull();
    });
  });

  describe('monthQuerySchema and historyQuerySchema', () => {
    it('parses valid year and month from strings or numbers', () => {
      const parsed = monthQuerySchema.parse({ year: '2026', month: '8' });
      expect(parsed.year).toBe(2026);
      expect(parsed.month).toBe(8);
    });

    it('allows undefined year and month', () => {
      const parsed = monthQuerySchema.parse({});
      expect(parsed.year).toBeUndefined();
      expect(parsed.month).toBeUndefined();
    });

    it('rejects out of range months', () => {
      expect(() => monthQuerySchema.parse({ month: 0 })).toThrow();
      expect(() => monthQuerySchema.parse({ month: 13 })).toThrow();
    });

    it('parses history query with default limit 6', () => {
      expect(historyQuerySchema.parse({}).limit).toBe(6);
      expect(historyQuerySchema.parse({ limit: '12' }).limit).toBe(12);
    });

    it('rejects history query limit outside 1..12', () => {
      expect(() => historyQuerySchema.parse({ limit: 0 })).toThrow();
      expect(() => historyQuerySchema.parse({ limit: 13 })).toThrow();
    });
  });

  describe('apiErrorSchema', () => {
    it('validates api error payload format', () => {
      const errorPayload = {
        error: {
          code: 'validation_error',
          message: 'Invalid request',
          details: { field: 'amount' },
        },
      };

      const result = apiErrorSchema.parse(errorPayload);
      expect(result.error.code).toBe('validation_error');
      expect(result.error.message).toBe('Invalid request');
    });
  });
});
