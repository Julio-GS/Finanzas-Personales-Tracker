import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import type { TransactionItem, MovementType } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight, Wallet, Trash2, Mic, ReceiptText, ArrowLeftRight } from 'lucide-react';

export interface TransactionListProps {
  transactions: TransactionItem[];
  onDelete?: (id: string) => Promise<void> | void;
  deletingId?: string | null;
  loading?: boolean;
}

const BADGES: Record<MovementType, { label: string; prefix: string; icon: React.ElementType; badgeClass: string; textClass: string }> = {
  income: { label: 'Ingreso', prefix: '+', icon: ArrowDownLeft, badgeClass: 'bg-success/15 text-success border-success/30', textClass: 'text-success' },
  expense: { label: 'Gasto', prefix: '-', icon: ArrowUpRight, badgeClass: 'bg-destructive/15 text-destructive border-destructive/30', textClass: 'text-destructive' },
  investment: { label: 'Inversión', prefix: '★', icon: Wallet, badgeClass: 'bg-primary/15 text-primary border-primary/30', textClass: 'text-primary' },
  transfer: { label: 'Transferencia', prefix: '⇄', icon: ArrowLeftRight, badgeClass: 'bg-secondary text-foreground border-border/60', textClass: 'text-foreground' },
};

export function TransactionList({ transactions, onDelete, deletingId = null, loading = false }: TransactionListProps): React.JSX.Element {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <ReceiptText className="h-4 w-4 text-muted-foreground" /> Transacciones del mes
        </CardTitle>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground/80">{transactions.length}</span>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Cargando transacciones...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No hay transacciones registradas este mes</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {transactions.map((tx) => {
              const badge = BADGES[tx.type];
              const Icon = badge.icon;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${badge.badgeClass}`} title={badge.label}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold truncate text-foreground">{tx.category}</span>
                        <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.badgeClass}`}>
                          {badge.prefix} {badge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {tx.type === 'transfer' && tx.destinationBankEntity
                            ? `${tx.bankEntity} → ${tx.destinationBankEntity}`
                            : tx.bankEntity}
                        </span>
                        <span>•</span>
                        <time dateTime={tx.date}>{tx.date}</time>
                      </div>
                      {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                      {tx.rawAudioPrompt && (
                        <p className="flex items-center gap-1 text-[11px] italic text-muted-foreground/80 truncate">
                          <Mic className="h-3 w-3 inline shrink-0" />
                          <span>&ldquo;{tx.rawAudioPrompt}&rdquo;</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold sm:text-base ${badge.textClass}`}>
                      {badge.prefix === '+' ? '+' : ''}{formatMoney(tx.amount)}
                    </span>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(tx.id)}
                        disabled={deletingId === tx.id}
                        aria-label={`Eliminar transacción ${tx.category} - ${tx.date}`}
                        type="button"
                        className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive hover:bg-destructive/15 active:scale-95 transition-transform"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
