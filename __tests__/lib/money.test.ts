import { describe, it, expect } from 'vitest';
import {
  calculateNetFlow,
  formatMoney,
  normalizeDecimalString,
  parseDecimalString,
} from '@/lib/money';

describe('Money Helpers', () => {
  describe('normalizeDecimalString', () => {
    it('normalizes numeric values and strings to 2 decimal places', () => {
      expect(normalizeDecimalString(1500)).toBe('1500.00');
      expect(normalizeDecimalString(1500.5)).toBe('1500.50');
      expect(normalizeDecimalString('1500.5')).toBe('1500.50');
      expect(normalizeDecimalString('250000.75')).toBe('250000.75');
      expect(normalizeDecimalString(0)).toBe('0.00');
    });

    it('handles negative numbers correctly', () => {
      expect(normalizeDecimalString(-450.2)).toBe('-450.20');
    });

    it('throws or handles invalid numbers', () => {
      expect(() => normalizeDecimalString('abc')).toThrow();
      expect(() => normalizeDecimalString(NaN)).toThrow();
    });
  });

  describe('parseDecimalString', () => {
    it('parses valid numeric or decimal string into a standard float number', () => {
      expect(parseDecimalString('1500.50')).toBe(1500.5);
      expect(parseDecimalString(1500.5)).toBe(1500.5);
      expect(parseDecimalString('0.00')).toBe(0);
    });
  });

  describe('calculateNetFlow', () => {
    it('calculates netFlow = income - expenses - investments', () => {
      const net = calculateNetFlow({
        income: '100000.00',
        expenses: '30000.00',
        investments: '20000.00',
      });
      expect(net).toBe('50000.00');
    });

    it('handles number inputs as well', () => {
      const net = calculateNetFlow({
        income: 50000,
        expenses: 25000.5,
        investments: 10000,
      });
      expect(net).toBe('14999.50');
    });

    it('handles negative net flow when expenses and investments exceed income', () => {
      const net = calculateNetFlow({
        income: '10000.00',
        expenses: '15000.00',
        investments: '5000.00',
      });
      expect(net).toBe('-10000.00');
    });
  });

  describe('formatMoney', () => {
    it('formats monetary value for display (ARS default / currency format)', () => {
      const formatted = formatMoney(1500.5);
      expect(formatted).toContain('1.500,50');

      const formattedStr = formatMoney('250000.00');
      expect(formattedStr).toContain('250.000,00');
    });
  });
});
