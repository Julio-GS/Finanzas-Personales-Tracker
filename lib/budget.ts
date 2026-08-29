export interface BudgetPercentages { needs: number; wants: number; savings: number; }
export interface BudgetCategorySplit { percentage: number; amount: string; }
export interface BudgetSplit {
  needs: BudgetCategorySplit;
  wants: BudgetCategorySplit;
  savings: BudgetCategorySplit;
  totalPercentage: number;
  isValid: boolean;
}
export interface BudgetPreset { id: string; name: string; percentages: BudgetPercentages; }

export const BUDGET_PRESETS: BudgetPreset[] = [
  { id: '50-30-20', name: '50/30/20 (Equilibrado)', percentages: { needs: 50, wants: 30, savings: 20 } },
  { id: '60-20-20', name: '60/20/20 (Ahorro Medio)', percentages: { needs: 60, wants: 20, savings: 20 } },
  { id: '40-40-20', name: '40/40/20 (Flexible)', percentages: { needs: 40, wants: 40, savings: 20 } },
];

export function computeSplit(totalIncome: number | string, percentages: BudgetPercentages): BudgetSplit {
  const income = typeof totalIncome === 'number' ? totalIncome : Number.parseFloat(String(totalIncome));
  const validIncome = !Number.isNaN(income) && Number.isFinite(income) && income > 0 ? income : 0;
  const totalPercentage = Math.round((percentages.needs + percentages.wants + percentages.savings) * 100) / 100;
  const calcAmount = (pct: number): string => ((validIncome * Math.max(0, pct)) / 100).toFixed(2);

  return {
    needs: { percentage: percentages.needs, amount: calcAmount(percentages.needs) },
    wants: { percentage: percentages.wants, amount: calcAmount(percentages.wants) },
    savings: { percentage: percentages.savings, amount: calcAmount(percentages.savings) },
    totalPercentage,
    isValid: totalPercentage === 100,
  };
}
