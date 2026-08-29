import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import type { MonthlyKpis } from '@/lib/types';
import { TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react';

export interface KpiCardsProps {
  kpis: MonthlyKpis;
  loading?: boolean;
}

export function KpiCards({ kpis, loading = false }: KpiCardsProps): React.JSX.Element {
  const isPositive = Number.parseFloat(kpis.netFlow) >= 0;
  const items = [
    { title: 'Ingresos', val: kpis.income, border: 'border-l-success', badgeBg: 'bg-success/15 text-success', tag: '+ Ingresos', icon: TrendingUp },
    { title: 'Gastos', val: kpis.expenses, border: 'border-l-destructive', badgeBg: 'bg-destructive/15 text-destructive', tag: '- Gastos', icon: TrendingDown },
    { title: 'Inversiones', val: kpis.investments, border: 'border-l-primary', badgeBg: 'bg-primary/15 text-primary', tag: '★ Inv', icon: Wallet },
    { title: 'Flujo Neto', val: kpis.netFlow, border: isPositive ? 'border-l-success' : 'border-l-destructive', badgeBg: isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive', tag: isPositive ? 'Positivo' : 'Déficit', icon: Scale, textClass: isPositive ? 'text-success' : 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title} className={`border-l-4 ${item.border} shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.title}</CardTitle>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${item.badgeBg}`}>
                <Icon className="h-3.5 w-3.5" /> {item.tag}
              </span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-xl font-bold tracking-tight sm:text-2xl ${item.textClass ?? ''}`}>{loading ? '...' : formatMoney(item.val)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
