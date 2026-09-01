import { z } from 'zod';

export const ALLOWED_ACCOUNTS = [
  'Banco Galicia',
  'Mercado Pago',
  'Naranja X',
  'Efectivo',
] as const;

export type AccountOption = (typeof ALLOWED_ACCOUNTS)[number];

export const accountOptionSchema = z.enum(ALLOWED_ACCOUNTS);

export function isAllowedAccount(value: unknown): value is AccountOption {
  return typeof value === 'string' && ALLOWED_ACCOUNTS.includes(value as AccountOption);
}

export interface BreakdownItem {
  label: string;
  total: string;
}

export interface AccountBreakdownItem extends BreakdownItem {
  account: string;
  income: string;
  expenses: string;
  investments: string;
  net: string;
}

export interface MonthlyKpis {
  income: string;
  expenses: string;
  investments: string;
  netFlow: string;
  cumulativeInvestments?: string;
}
