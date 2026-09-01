import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import type { BreakdownItem, AccountBreakdownItem } from '@/lib/accounts';
import { Building2, Tags } from 'lucide-react';

export interface BreakdownListProps {
  byEntity: (BreakdownItem | AccountBreakdownItem)[];
  byCategory: BreakdownItem[];
  loading?: boolean;
}

function AccountSection({ items, loading }: { items: (BreakdownItem | AccountBreakdownItem)[]; loading?: boolean }) {
  const sum = items.reduce((acc, item) => acc + (Number.parseFloat(item.total) || 0), 0);
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Building2 className="h-4 w-4 text-muted-foreground" /> Por Entidad / Cuenta
        </CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} cuentas</span>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Cargando...</div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sin movimientos en este período</p>
        ) : (
          items.map((item, idx) => {
            const accItem = item as Partial<AccountBreakdownItem>;
            const inv = accItem.investments ? Number.parseFloat(accItem.investments) : 0;
            const netVal = accItem.net !== undefined ? Number.parseFloat(accItem.net) : (Number.parseFloat(item.total) || 0);
            const isNetPos = netVal >= 0;
            const pct = sum > 0 ? Math.round(((Number.parseFloat(item.total) || 0) / sum) * 100) : 0;

            return (
              <div key={item.label || accItem.account} className="space-y-2 rounded-xl border border-border/50 bg-secondary/15 p-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <span className="text-[10px] font-semibold text-muted-foreground w-4">#{idx + 1}</span>
                    <span className="truncate font-semibold text-foreground">{accItem.account || item.label}</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-xs sm:text-sm">
                    <span className="text-[11px] font-normal text-muted-foreground">Neto:</span>
                    <span className={isNetPos ? 'text-success' : 'text-destructive'}>
                      {formatMoney(netVal)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Ingresos:</span>
                    <span className="font-semibold text-success">+{formatMoney(accItem.income ?? '0.00')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Gastos:</span>
                    <span className="font-semibold text-destructive">-{formatMoney(accItem.expenses ?? '0.00')}</span>
                  </div>
                  {inv > 0 && (
                    <div className="col-span-2 flex items-center justify-between text-[11px] bg-primary/10 px-2 py-0.5 rounded">
                      <span className="text-primary font-medium">Inversión (movimiento):</span>
                      <span className="font-semibold text-primary">★ {formatMoney(accItem.investments ?? '0.00')}</span>
                    </div>
                  )}
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.label || accItem.account} ${pct}%`}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function CategorySection({ items, loading }: { items: BreakdownItem[]; loading?: boolean }) {
  const sum = items.reduce((acc, item) => acc + (Number.parseFloat(item.total) || 0), 0);
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Tags className="h-4 w-4 text-muted-foreground" /> Por Categoría
        </CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} grupos</span>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Cargando...</div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sin movimientos en este período</p>
        ) : (
          items.map((item, idx) => {
            const pct = sum > 0 ? Math.round(((Number.parseFloat(item.total) || 0) / sum) * 100) : 0;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <span className="text-[10px] font-semibold text-muted-foreground w-4">#{idx + 1}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{formatMoney(item.total)}</span>
                    <span className="text-[11px] font-normal text-muted-foreground w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.label} ${pct}%`} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function BreakdownList({ byEntity, byCategory, loading = false }: BreakdownListProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AccountSection items={byEntity} loading={loading} />
      <CategorySection items={byCategory} loading={loading} />
    </div>
  );
}
