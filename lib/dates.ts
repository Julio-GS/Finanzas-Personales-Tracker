export interface MonthRange {
  year: number;
  month: number;
  start: string;
  endExclusive: string;
  startDate: Date;
  endExclusiveDate: Date;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Check valid date for month/year (e.g. leap years, 30-day months)
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthRange(year?: number, month?: number): MonthRange {
  const now = new Date();
  const effectiveYear = typeof year === 'number' && !Number.isNaN(year) ? year : now.getFullYear();
  const effectiveMonth =
    typeof month === 'number' && !Number.isNaN(month) && month >= 1 && month <= 12
      ? month
      : now.getMonth() + 1;

  const startYear = effectiveYear;
  const startMonth = effectiveMonth;
  const nextYear = startMonth === 12 ? startYear + 1 : startYear;
  const nextMonth = startMonth === 12 ? 1 : startMonth + 1;

  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const endExclusiveDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1));

  return {
    year: effectiveYear,
    month: effectiveMonth,
    start,
    endExclusive,
    startDate,
    endExclusiveDate,
  };
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function getMonthName(month: number): string {
  const idx = Math.max(1, Math.min(12, month)) - 1;
  return MONTH_NAMES[idx] ?? 'Mes';
}

export function parseMonthQuery(
  year?: string | number,
  month?: string | number
): { year: number; month: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let parsedYear = typeof year === 'number' ? year : Number.parseInt(String(year), 10);
  let parsedMonth = typeof month === 'number' ? month : Number.parseInt(String(month), 10);

  if (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
    parsedYear = currentYear;
  }

  if (Number.isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    parsedMonth = currentMonth;
  }

  return {
    year: parsedYear,
    month: parsedMonth,
  };
}
