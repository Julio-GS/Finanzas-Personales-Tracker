'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { getMonthName } from '@/lib/dates';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export interface MonthNavigatorProps {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
  onCurrentMonth: () => void;
  isCurrentMonth?: boolean;
  disabled?: boolean;
}

export function MonthNavigator({
  year,
  month,
  onPrevious,
  onNext,
  onCurrentMonth,
  isCurrentMonth = false,
  disabled = false,
}: MonthNavigatorProps): React.JSX.Element {
  const monthName = getMonthName(month);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={disabled}
          aria-label="Mes anterior"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[140px] text-center text-base font-semibold tracking-tight sm:min-w-[170px] sm:text-lg">
          {monthName} {year}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={disabled}
          aria-label="Mes siguiente"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button
        variant="secondary"
        size="default"
        onClick={onCurrentMonth}
        disabled={disabled || isCurrentMonth}
        aria-label="Mes actual"
        type="button"
        className="h-11 text-xs sm:text-sm"
      >
        <Calendar className="mr-1.5 h-4 w-4" /> Mes actual
      </Button>
    </div>
  );
}
