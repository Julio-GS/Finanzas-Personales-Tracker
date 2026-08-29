'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MonthNavigator } from './MonthNavigator';
import { KpiCards } from './KpiCards';
import { BreakdownList } from './BreakdownList';
import { TransactionList } from './TransactionList';
import { HistoryTrend } from './HistoryTrend';
import { BudgetCalculator } from '@/components/budget/BudgetCalculator';
import { ManualTransactionForm } from '@/components/transactions/ManualTransactionForm';
import { VoiceRecorder } from '@/components/transactions/VoiceRecorder';
import { fetchDashboard, deleteTransaction, UnauthorizedError } from '@/lib/dashboard';
import type { MonthDashboardData } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DashboardClientProps {
  initialYear?: number;
  initialMonth?: number;
}

const EMPTY_KPIS = { income: '0.00', expenses: '0.00', investments: '0.00', netFlow: '0.00' };

export function DashboardClient({ initialYear, initialMonth }: DashboardClientProps): React.JSX.Element {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth ?? now.getMonth() + 1);
  const [data, setData] = useState<MonthDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  const isCurrent = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  const loadData = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchDashboard(year, month);
      setData(result);
      setStatusMessage(`Datos actualizados para mes ${month}/${year}`);
      setHistoryRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        window.location.href = '/login';
        return;
      }
      setErrorMessage('No se pudieron cargar los datos del mes. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(currentYear, currentMonth); }, [currentYear, currentMonth, loadData]);

  const handlePrev = () => {
    if (currentMonth === 1) { setCurrentYear((y) => y - 1); setCurrentMonth(12); }
    else { setCurrentMonth((m) => m - 1); }
  };
  const handleNext = () => {
    if (currentMonth === 12) { setCurrentYear((y) => y + 1); setCurrentMonth(1); }
    else { setCurrentMonth((m) => m + 1); }
  };
  const handleCurrent = () => { setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1); };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setStatusMessage('Transacción eliminada');
      await loadData(currentYear, currentMonth);
    } catch (err) {
      if (err instanceof UnauthorizedError) { window.location.href = '/login'; return; }
      setErrorMessage('No se pudo eliminar la transacción.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 pt-safe">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{statusMessage}</div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">Finanzas Tracker</h1>
          <p className="text-xs text-muted-foreground sm:text-sm mt-0.5">Voice-first personal finance & investment tracker</p>
        </div>
        <LogoutButton variant="outline" />
      </header>
      <section aria-label="Navegación de mes">
        <MonthNavigator year={currentYear} month={currentMonth} onPrevious={handlePrev} onNext={handleNext} onCurrentMonth={handleCurrent} isCurrentMonth={isCurrent} disabled={isLoading} />
      </section>
      {errorMessage && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></div>
          <Button variant="outline" size="sm" onClick={() => loadData(currentYear, currentMonth)} className="gap-1 border-destructive/30 hover:bg-destructive/20"><RefreshCw className="h-3 w-3" /> Reintentar</Button>
        </div>
      )}
      <section aria-label="Indicadores del mes"><KpiCards kpis={data?.kpis ?? EMPTY_KPIS} loading={isLoading} /></section>
      <section aria-label="Registro de transacciones" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VoiceRecorder onSuccess={() => loadData(currentYear, currentMonth)} />
        <ManualTransactionForm onSuccess={() => loadData(currentYear, currentMonth)} />
      </section>
      <section aria-label="Distribución y categorías"><BreakdownList byEntity={data?.breakdowns.byEntity ?? []} byCategory={data?.breakdowns.byCategory ?? []} loading={isLoading} /></section>
      <section aria-label="Evolución histórica y presupuesto" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HistoryTrend refreshKey={historyRefreshKey} />
        <BudgetCalculator />
      </section>
      <section aria-label="Listado de transacciones"><TransactionList transactions={data?.transactions ?? []} onDelete={handleDelete} deletingId={deletingId} loading={isLoading} /></section>
    </div>
  );
}
