import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import type { MonthlyKpis, BreakdownItem, AccountBreakdownItem } from '@/lib/accounts';
import { TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react';

export interface KpiCardsProps {
  kpis: MonthlyKpis;
  byEntity?: (BreakdownItem | AccountBreakdownItem)[];
  accounts?: (BreakdownItem | AccountBreakdownItem)[];
  loading?: boolean;
}

export function KpiCards({ kpis, byEntity, accounts, loading = false }: KpiCardsProps): React.JSX.Element {
  const isPositive = Number.parseFloat(kpis.netFlow) >= 0;
  const items = [
    { title: 'Ingresos', val: kpis.income, border: 'border-l-success', badgeBg: 'bg-success/15 text-success', tag: '+ Ingresos', icon: TrendingUp },
    { title: 'Gastos', val: kpis.expenses, border: 'border-l-destructive', badgeBg: 'bg-destructive/15 text-destructive', tag: '- Gastos', icon: TrendingDown },
    { title: 'Inversiones', val: kpis.investments, border: 'border-l-primary', badgeBg: 'bg-primary/15 text-primary', tag: '★ Inv', icon: Wallet },
    { title: 'Inversión Acumulada', val: kpis.cumulativeInvestments ?? '0.00', border: 'border-l-primary', badgeBg: 'bg-primary/15 text-primary', tag: 'Histórico', icon: Wallet },
    { title: 'Flujo Neto', val: kpis.netFlow, border: isPositive ? 'border-l-success' : 'border-l-destructive', badgeBg: isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive', tag: isPositive ? 'Positivo' : 'Déficit', icon: Scale, textClass: isPositive ? 'text-success' : 'text-destructive' },
  ];

  const entityList = byEntity ?? accounts ?? [];
  const positiveAccounts = entityList
    .map((item) => {
      const accItem = item as Partial<AccountBreakdownItem>;
      const name = accItem.account || item.label || 'Cuenta';
      const netVal = accItem.net !== undefined ? Number.parseFloat(accItem.net) : (Number.parseFloat(item.total) || 0);
      return { name, netVal };
    })
    .filter((acc) => Number.isFinite(acc.netVal) && acc.netVal > 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const isNetFlow = item.title === 'Flujo Neto';

        return (
          <Card key={item.title} className={`flex flex-col justify-between border-l-4 ${item.border} shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.title}</CardTitle>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${item.badgeBg}`}>
                <Icon className="h-3.5 w-3.5" /> {item.tag}
              </span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-xl font-bold tracking-tight sm:text-2xl ${item.textClass ?? ''}`}>{loading ? '...' : formatMoney(item.val)}</div>
              {isNetFlow && (
                <div className="mt-3 border-t border-border/40 pt-2 text-xs">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Remanente por cuenta
                  </div>
                  {loading ? (
                    <p className="text-[11px] text-muted-foreground">Cargando...</p>
                  ) : positiveAccounts.length > 0 ? (
                    <div className="space-y-1" role="list" aria-label="Cuentas con remanente positivo">
                      {positiveAccounts.map((acc) => (
                        <div key={acc.name} role="listitem" className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="truncate text-muted-foreground font-medium">{acc.name}</span>
                          <span className="font-semibold text-success shrink-0">+{formatMoney(acc.netVal)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Sin remanente en cuentas
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
