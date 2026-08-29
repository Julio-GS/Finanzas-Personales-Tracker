import { describe, it, expect } from 'vitest';
import { getMonthRange, isValidIsoDate, formatIsoDate, parseMonthQuery, getMonthName } from '@/lib/dates';

describe('Date Helpers', () => {
  describe('getMonthRange', () => {
    it('returns correct start and endExclusive for a standard month (e.g. August 2026)', () => {
      const range = getMonthRange(2026, 8);
      expect(range.year).toBe(2026);
      expect(range.month).toBe(8);
      expect(range.start).toBe('2026-08-01');
      expect(range.endExclusive).toBe('2026-09-01');
    });

    it('handles year-boundary month (December 2026 -> January 2027)', () => {
      const range = getMonthRange(2026, 12);
      expect(range.year).toBe(2026);
      expect(range.month).toBe(12);
      expect(range.start).toBe('2026-12-01');
      expect(range.endExclusive).toBe('2027-01-01');
    });

    it('handles February in leap and non-leap years', () => {
      const nonLeap = getMonthRange(2025, 2);
      expect(nonLeap.start).toBe('2025-02-01');
      expect(nonLeap.endExclusive).toBe('2025-03-01');

      const leap = getMonthRange(2024, 2);
      expect(leap.start).toBe('2024-02-01');
      expect(leap.endExclusive).toBe('2024-03-01');
    });

    it('defaults to current month and year when arguments are omitted', () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const range = getMonthRange();
      expect(range.year).toBe(currentYear);
      expect(range.month).toBe(currentMonth);
      expect(range.start).toBe(
        `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      );
    });
  });

  describe('isValidIsoDate', () => {
    it('returns true for valid YYYY-MM-DD strings', () => {
      expect(isValidIsoDate('2026-08-26')).toBe(true);
      expect(isValidIsoDate('2024-02-29')).toBe(true);
      expect(isValidIsoDate('2025-12-31')).toBe(true);
    });

    it('returns false for invalid date strings', () => {
      expect(isValidIsoDate('2025-02-29')).toBe(false); // 2025 is not a leap year
      expect(isValidIsoDate('2026-13-01')).toBe(false);
      expect(isValidIsoDate('26/08/2026')).toBe(false);
      expect(isValidIsoDate('2026-8-6')).toBe(false);
      expect(isValidIsoDate('')).toBe(false);
      expect(isValidIsoDate('invalid')).toBe(false);
    });
  });

  describe('formatIsoDate', () => {
    it('formats Date object to YYYY-MM-DD string', () => {
      const date = new Date(2026, 7, 26); // August is month index 7
      expect(formatIsoDate(date)).toBe('2026-08-26');
    });
  });

  describe('parseMonthQuery', () => {
    it('parses valid string or number inputs', () => {
      expect(parseMonthQuery('2026', '8')).toEqual({ year: 2026, month: 8 });
      expect(parseMonthQuery(2026, 8)).toEqual({ year: 2026, month: 8 });
    });

    it('defaults to current month and year when inputs are undefined or invalid', () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      expect(parseMonthQuery(undefined, undefined)).toEqual({
        year: currentYear,
        month: currentMonth,
      });

      expect(parseMonthQuery('invalid', '99')).toEqual({
        year: currentYear,
        month: currentMonth,
      });
    });
  });

  describe('getMonthName', () => {
    it('returns correct Spanish month names and clamps safely', () => {
      expect(getMonthName(1)).toBe('Enero');
      expect(getMonthName(8)).toBe('Agosto');
      expect(getMonthName(12)).toBe('Diciembre');
      expect(getMonthName(0)).toBe('Enero');
      expect(getMonthName(13)).toBe('Diciembre');
    });
  });
});
