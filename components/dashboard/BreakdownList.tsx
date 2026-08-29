import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import type { BreakdownItem } from '@/lib/types';
import { Building2, Tags } from 'lucide-react';

export interface BreakdownListProps {
  byEntity: BreakdownItem[];
  byCategory: BreakdownItem[];
  loading?: boolean;
}

function Section({ title, icon: Icon, items, loading }: { title: string; icon: React.ElementType; items: BreakdownItem[]; loading?: boolean }) {
  const sum = items.reduce((acc, item) => acc + (Number.parseFloat(item.total) || 0), 0);
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
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
      <Section title="Por Entidad / Cuenta" icon={Building2} items={byEntity} loading={loading} />
      <Section title="Por Categoría" icon={Tags} items={byCategory} loading={loading} />
    </div>
  );
}
