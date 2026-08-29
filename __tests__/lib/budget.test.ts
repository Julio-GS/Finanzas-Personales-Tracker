import { describe, it, expect } from 'vitest';
import { computeSplit, BUDGET_PRESETS } from '@/lib/budget';

describe('computeSplit helper', () => {
  it('calculates 50/30/20 distribution for positive income', () => {
    const split = computeSplit(100000, { needs: 50, wants: 30, savings: 20 });
    expect(split.needs.amount).toBe('50000.00');
    expect(split.wants.amount).toBe('30000.00');
    expect(split.savings.amount).toBe('20000.00');
    expect(split.totalPercentage).toBe(100);
    expect(split.isValid).toBe(true);
  });

  it('calculates custom percentages correctly', () => {
    const split = computeSplit(250000, { needs: 70, wants: 20, savings: 10 });
    expect(split.needs.amount).toBe('175000.00');
    expect(split.wants.amount).toBe('50000.00');
    expect(split.savings.amount).toBe('25000.00');
    expect(split.totalPercentage).toBe(100);
    expect(split.isValid).toBe(true);
  });

  it('marks isValid as false when percentages do not equal 100', () => {
    expect(computeSplit(100000, { needs: 60, wants: 30, savings: 20 }).isValid).toBe(false);
    expect(computeSplit(100000, { needs: 40, wants: 30, savings: 20 }).isValid).toBe(false);
  });

  it('handles zero, negative, or invalid income safely', () => {
    expect(computeSplit(0, { needs: 50, wants: 30, savings: 20 }).needs.amount).toBe('0.00');
    expect(computeSplit(-5000, { needs: 50, wants: 30, savings: 20 }).needs.amount).toBe('0.00');
    expect(computeSplit('invalid', { needs: 50, wants: 30, savings: 20 }).needs.amount).toBe('0.00');
  });

  it('handles edge distributions like 100/0/0, 99%, and 101%', () => {
    const full = computeSplit(100000, { needs: 100, wants: 0, savings: 0 });
    expect(full.needs.amount).toBe('100000.00');
    expect(full.wants.amount).toBe('0.00');
    expect(full.isValid).toBe(true);
    expect(computeSplit(100000, { needs: 49, wants: 30, savings: 20 }).totalPercentage).toBe(99);
    expect(computeSplit(100000, { needs: 51, wants: 30, savings: 20 }).totalPercentage).toBe(101);
  });

  it('handles fractional percentage rounding', () => {
    const split = computeSplit(100000, { needs: 33.33, wants: 33.33, savings: 33.34 });
    expect(split.needs.amount).toBe('33330.00');
    expect(split.savings.amount).toBe('33340.00');
    expect(split.isValid).toBe(true);
  });
});

describe('BUDGET_PRESETS domain', () => {
  it('contains exactly 50/30/20, 60/20/20, and 40/40/20 presets', () => {
    expect(BUDGET_PRESETS).toHaveLength(3);
    expect(BUDGET_PRESETS.map((p) => p.percentages)).toEqual([
      { needs: 50, wants: 30, savings: 20 },
      { needs: 60, wants: 20, savings: 20 },
      { needs: 40, wants: 40, savings: 20 },
    ]);
    expect(BUDGET_PRESETS.some((p) => p.id === '70-20-10')).toBe(false);
    expect(BUDGET_PRESETS.some((p) => p.id === '80-20-0')).toBe(false);
    expect(BUDGET_PRESETS.some((p) => p.id === '40-40-20')).toBe(true);
  });
});
