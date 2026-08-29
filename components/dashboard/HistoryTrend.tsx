'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchHistory, UnauthorizedError } from '@/lib/dashboard';
import { formatMoney } from '@/lib/money';
import { getMonthName } from '@/lib/dates';
import type { HistoryMonthItem } from '@/lib/types';
import { LineChart, AlertCircle, RefreshCw, TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react';

export interface HistoryTrendProps {
  refreshKey?: number | string;
  initialData?: HistoryMonthItem[];
}

export function HistoryTrend({ refreshKey, initialData }: HistoryTrendProps): React.JSX.Element {
  const [months, setMonths] = useState<HistoryMonthItem[]>(initialData ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchHistory(6);
      setMonths(data.months ?? []);
    } catch (err) {
      if (err instanceof UnauthorizedError) { window.location.href = '/login'; return; }
      setErrorMessage('No se pudo cargar la evolución histórica.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory, refreshKey]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <div className="flex items-center gap-2"><LineChart className="h-5 w-5 text-primary" /><CardTitle className="text-lg font-bold sm:text-xl">Evolución Histórica</CardTitle></div>
          <CardDescription>Últimos meses registrados (ingresos, gastos, inversiones y saldo neto).</CardDescription>
        </div>
        {!isLoading && !errorMessage && (
          <Button type="button" variant="ghost" size="sm" onClick={loadHistory} className="gap-1 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Cargando historial financiero...</div>
        ) : errorMessage ? (
          <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>
            <Button type="button" variant="outline" size="sm" onClick={loadHistory} className="text-xs border-destructive/30 hover:bg-destructive/20">Reintentar</Button>
          </div>
        ) : months.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No hay datos históricos suficientes para mostrar la evolución.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {months.map((item) => {
              const isPositive = Number.parseFloat(item.netFlow) >= 0;
              const monthLabel = `${getMonthName(item.month)} ${item.year}`;
              return (
                <div key={`${item.year}-${item.month}`} className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                    <span className="font-semibold text-xs capitalize text-foreground">{monthLabel}</span>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                      <Scale className="h-3 w-3" /> {isPositive ? 'Neto +' : 'Déficit'}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground"><span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-success" /> Ingresos:</span><span className="font-medium text-foreground">{formatMoney(item.income)}</span></div>
                    <div className="flex justify-between items-center text-muted-foreground"><span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-destructive" /> Gastos:</span><span className="font-medium text-foreground">{formatMoney(item.expenses)}</span></div>
                    <div className="flex justify-between items-center text-muted-foreground"><span className="flex items-center gap-1"><Wallet className="h-3 w-3 text-primary" /> Inversión:</span><span className="font-medium text-foreground">{formatMoney(item.investments)}</span></div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/40 font-semibold text-xs"><span>Flujo Neto:</span><span className={isPositive ? 'text-success' : 'text-destructive'}>{formatMoney(item.netFlow)}</span></div>
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
