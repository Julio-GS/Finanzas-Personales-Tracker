export function normalizeDecimalString(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(String(amount));
  if (typeof num !== 'number' || Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error('Invalid numeric amount');
  }
  return num.toFixed(2);
}

export function parseDecimalString(amount: string | number): number {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(String(amount));
  if (Number.isNaN(num)) {
    throw new Error('Invalid numeric string');
  }
  return num;
}

export interface NetFlowInput {
  income: number | string;
  expenses: number | string;
  investments: number | string;
}

export function calculateNetFlow(input: NetFlowInput): string {
  const inc = parseDecimalString(input.income);
  const exp = parseDecimalString(input.expenses);
  const inv = parseDecimalString(input.investments);

  const net = inc - exp - inv;
  return net.toFixed(2);
}

export function formatMoney(amount: number | string, currency: string = 'ARS'): string {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(String(amount));
  if (Number.isNaN(num)) {
    return '$ 0,00';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
