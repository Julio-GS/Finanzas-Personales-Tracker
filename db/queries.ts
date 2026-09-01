import 'server-only';
import { eq, and, gte, lt, desc, sql } from 'drizzle-orm';
import { getDb, type Database } from './client';
import { transactions, type Transaction } from './schema';
import { getMonthRange } from '@/lib/dates';
import { normalizeDecimalString, calculateNetFlow } from '@/lib/money';
import {
  ALLOWED_ACCOUNTS,
  type BreakdownItem,
  type AccountBreakdownItem,
} from '@/lib/accounts';

export type { BreakdownItem, AccountBreakdownItem };

export interface MonthlyKpis {
  income: string;
  expenses: string;
  investments: string;
  netFlow: string;
  cumulativeInvestments?: string;
}

export interface MonthDashboardData {
  month: {
    year: number;
    month: number;
    start: string;
    endExclusive: string;
  };
  kpis: MonthlyKpis;
  breakdowns: {
    byEntity: AccountBreakdownItem[];
    byCategory: BreakdownItem[];
  };
  transactions: Transaction[];
}

export interface HistoryMonthItem {
  year: number;
  month: number;
  income: string;
  expenses: string;
  investments: string;
  netFlow: string;
}

export interface InsertTransactionInput {
  type: 'income' | 'expense' | 'investment';
  amount: string | number;
  bankEntity: string;
  category: string;
  date: string;
  description?: string | null;
  rawAudioPrompt?: string | null;
}

/**
 * Inserts a transaction into Neon Postgres using parameterized Drizzle query.
 */
export async function insertTransaction(
  data: InsertTransactionInput,
  dbClient?: Database
): Promise<Transaction> {
  const client = dbClient ?? getDb();
  const normalizedAmount = normalizeDecimalString(data.amount);
  const trimmedBankEntity = data.bankEntity.trim();
  const trimmedCategory = data.category.trim();
  const normalizedDescription =
    data.description && data.description.trim().length > 0
      ? data.description.trim()
      : null;
  const normalizedAudioPrompt =
    data.rawAudioPrompt && data.rawAudioPrompt.trim().length > 0
      ? data.rawAudioPrompt.trim()
      : null;

  const [created] = await client
    .insert(transactions)
    .values({
      type: data.type,
      amount: normalizedAmount,
      bankEntity: trimmedBankEntity,
      category: trimmedCategory,
      date: data.date,
      description: normalizedDescription,
      rawAudioPrompt: normalizedAudioPrompt,
    })
    .returning();

  return created;
}

/**
 * Retrieves monthly dashboard data: month metadata, KPIs, breakdowns, and transaction list.
 * Filtered to [startOfMonth, startOfNextMonth).
 */
export async function getMonthDashboard(
  year?: number,
  month?: number,
  dbClient?: Database
): Promise<MonthDashboardData> {
  const client = dbClient ?? getDb();
  const monthRange = getMonthRange(year, month);
  const { start, endExclusive } = monthRange;

  const txList = await client
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lt(transactions.date, endExclusive)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  let income = 0;
  let expenses = 0;
  let investments = 0;

  const accountMap = new Map<
    string,
    { income: number; expenses: number; investments: number }
  >();

  // Always initialize the 4 fixed accounts
  for (const account of ALLOWED_ACCOUNTS) {
    accountMap.set(account, { income: 0, expenses: 0, investments: 0 });
  }

  const categoryMap = new Map<string, number>();

  for (const tx of txList) {
    const amt = Number.parseFloat(String(tx.amount)) || 0;
    if (tx.type === 'income') {
      income += amt;
    } else if (tx.type === 'expense') {
      expenses += amt;
    } else if (tx.type === 'investment') {
      investments += amt;
    }

    let stats = accountMap.get(tx.bankEntity);
    if (!stats) {
      stats = { income: 0, expenses: 0, investments: 0 };
      accountMap.set(tx.bankEntity, stats);
    }

    if (tx.type === 'income') {
      stats.income += amt;
    } else if (tx.type === 'expense') {
      stats.expenses += amt;
    } else if (tx.type === 'investment') {
      stats.investments += amt;
    }

    categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + amt);
  }

  const fixedOrder = new Map<string, number>(
    ALLOWED_ACCOUNTS.map((acc, idx) => [acc, idx])
  );

  const byEntity: AccountBreakdownItem[] = Array.from(accountMap.entries())
    .map(([account, stats]) => {
      const net = stats.income - stats.expenses;
      const totalActivity = stats.income + stats.expenses + stats.investments;
      return {
        account,
        label: account,
        income: stats.income.toFixed(2),
        expenses: stats.expenses.toFixed(2),
        investments: stats.investments.toFixed(2),
        net: net.toFixed(2),
        total: totalActivity.toFixed(2),
      };
    })
    .sort((a, b) => {
      const idxA = fixedOrder.get(a.account);
      const idxB = fixedOrder.get(b.account);
      if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
      if (idxA !== undefined) return -1;
      if (idxB !== undefined) return 1;
      return a.account.localeCompare(b.account);
    });

  const byCategory: BreakdownItem[] = Array.from(categoryMap.entries())
    .map(([label, total]) => ({ label, total: total.toFixed(2) }))
    .sort(
      (a, b) =>
        Number.parseFloat(b.total) - Number.parseFloat(a.total) ||
        a.label.localeCompare(b.label)
    );

  // Cumulative investments across all history
  const [invRow] = await client
    .select({
      totalInvestments: sql<string>`coalesce(sum(${transactions.amount}), 0)::text`,
    })
    .from(transactions)
    .where(eq(transactions.type, 'investment'));

  const cumulativeInvestments = normalizeDecimalString(
    invRow?.totalInvestments ?? '0'
  );

  const incomeStr = income.toFixed(2);
  const expensesStr = expenses.toFixed(2);
  const investmentsStr = investments.toFixed(2);
  const netFlowStr = calculateNetFlow({
    income: incomeStr,
    expenses: expensesStr,
    investments: investmentsStr,
  });

  return {
    month: {
      year: monthRange.year,
      month: monthRange.month,
      start: monthRange.start,
      endExclusive: monthRange.endExclusive,
    },
    kpis: {
      income: incomeStr,
      expenses: expensesStr,
      investments: investmentsStr,
      netFlow: netFlowStr,
      cumulativeInvestments,
    },
    breakdowns: {
      byEntity,
      byCategory,
    },
    transactions: txList,
  };
}

/**
 * Deletes a transaction by ID.
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteTransactionById(
  id: string,
  dbClient?: Database
): Promise<boolean> {
  const client = dbClient ?? getDb();
  const result = await client
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id });

  return result.length > 0;
}

/**
 * Retrieves monthly aggregated trend report for the last N months with transactions.
 * Returns months in chronological order.
 */
export async function getHistoryReport(
  limit: number = 6,
  dbClient?: Database
): Promise<HistoryMonthItem[]> {
  const client = dbClient ?? getDb();
  const effectiveLimit = Math.max(1, Math.min(12, limit));
  const monthExpr = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;

  const rows = await client
    .select({
      monthKey: monthExpr,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)::text`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)::text`,
      investments: sql<string>`coalesce(sum(case when ${transactions.type} = 'investment' then ${transactions.amount} else 0 end), 0)::text`,
    })
    .from(transactions)
    .groupBy(monthExpr)
    .orderBy(desc(monthExpr))
    .limit(effectiveLimit);

  const result: HistoryMonthItem[] = rows
    .map((row) => {
      const [yStr, mStr] = row.monthKey.split('-');
      const year = Number.parseInt(yStr, 10);
      const month = Number.parseInt(mStr, 10);
      const inc = normalizeDecimalString(row.income);
      const exp = normalizeDecimalString(row.expenses);
      const inv = normalizeDecimalString(row.investments);
      const net = calculateNetFlow({
        income: inc,
        expenses: exp,
        investments: inv,
      });

      return {
        year,
        month,
        income: inc,
        expenses: exp,
        investments: inv,
        netFlow: net,
      };
    })
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

  return result;
}
