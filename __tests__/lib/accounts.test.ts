import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ACCOUNTS,
  isAllowedAccount,
  accountOptionSchema,
  type AccountOption,
} from '@/lib/accounts';

describe('lib/accounts - Fixed Financial Accounts Catalog', () => {
  it('defines exactly the four required fixed accounts in Spanish', () => {
    expect(ALLOWED_ACCOUNTS).toEqual([
      'Banco Galicia',
      'Mercado Pago',
      'Naranja X',
      'Efectivo',
    ]);
    expect(ALLOWED_ACCOUNTS.length).toBe(4);
  });

  it('validates accountOptionSchema with allowed values and rejects unknown entities', () => {
    for (const account of ALLOWED_ACCOUNTS) {
      const parsed: AccountOption = accountOptionSchema.parse(account);
      expect(parsed).toBe(account);
      expect(isAllowedAccount(account)).toBe(true);
    }

    expect(() => accountOptionSchema.parse('Santander')).toThrow();
    expect(() => accountOptionSchema.parse('Lemon')).toThrow();
    expect(() => accountOptionSchema.parse('BBVA')).toThrow();
    expect(() => accountOptionSchema.parse('')).toThrow();
    expect(isAllowedAccount('Santander')).toBe(false);
    expect(isAllowedAccount('')).toBe(false);
  });
});
