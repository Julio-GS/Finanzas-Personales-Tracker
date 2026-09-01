export type MovementType = 'income' | 'expense' | 'investment' | 'transfer';

export interface TransactionItem {
  id: string;
  createdAt: string;
  date: string;
  type: MovementType;
  amount: string;
  bankEntity: string;
  destinationBankEntity?: string | null;
  category: string;
  description: string | null;
  rawAudioPrompt: string | null;
}

export interface MonthlyKpis {
  income: string;
  expenses: string;
  investments: string;
  netFlow: string;
}

export interface BreakdownItem {
  label: string;
  total: string;
}

export interface MonthMetadata {
  year: number;
  month: number;
  start: string;
  endExclusive: string;
}

export interface MonthDashboardData {
  month: MonthMetadata;
  kpis: MonthlyKpis;
  breakdowns: { byEntity: BreakdownItem[]; byCategory: BreakdownItem[] };
  transactions: TransactionItem[];
}

export interface HistoryMonthItem {
  year: number;
  month: number;
  income: string;
  expenses: string;
  investments: string;
  netFlow: string;
}

export interface HistoryReportData {
  months: HistoryMonthItem[];
}

