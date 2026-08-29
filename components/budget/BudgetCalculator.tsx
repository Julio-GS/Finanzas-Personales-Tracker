'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { computeSplit, BUDGET_PRESETS, type BudgetPercentages } from '@/lib/budget';
import { formatMoney } from '@/lib/money';
import { Calculator, AlertTriangle, CheckCircle2, Sliders, ShieldCheck, Heart, PiggyBank } from 'lucide-react';

export interface BudgetCalculatorProps {
  initialIncome?: string;
  initialPercentages?: BudgetPercentages;
}

export function BudgetCalculator({
  initialIncome = '',
  initialPercentages = { needs: 50, wants: 30, savings: 20 },
}: BudgetCalculatorProps): React.JSX.Element {
  const [income, setIncome] = useState<string>(initialIncome);
  const [percentages, setPercentages] = useState<BudgetPercentages>(initialPercentages);
  const split = computeSplit(income, percentages);

  const handlePctChange = (key: keyof BudgetPercentages, val: number) => {
    setPercentages((prev) => ({ ...prev, [key]: Number.isNaN(val) ? 0 : val }));
  };

  const categories = [
    { key: 'needs' as const, label: 'Necesidades (Alquiler, comida, servicios)', short: 'Necesidades', color: 'text-success', icon: ShieldCheck, data: split.needs },
    { key: 'wants' as const, label: 'Deseos (Salidas, ocio, compras)', short: 'Deseos', color: 'text-warning', icon: Heart, data: split.wants },
    { key: 'savings' as const, label: 'Ahorro / Inversión (Fondo, CEDEARs)', short: 'Ahorro e Inversión', color: 'text-primary', icon: PiggyBank, data: split.savings },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-lg font-bold sm:text-xl">Calculadora de Presupuesto</CardTitle></div>
        <CardDescription>Planifica la distribución de tus ingresos en base a porcentajes personalizables (cálculo 100% cliente).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="budget-income" className="text-sm font-medium">Ingreso mensual ($)</Label>
          <Input id="budget-income" type="number" min="0" step="any" placeholder="Ej. 150000" value={income} onChange={(e) => setIncome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sliders className="h-3.5 w-3.5" /> Reglas y Presets</Label>
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_PRESETS.map((p) => (
              <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => setPercentages(p.percentages)}>{p.name}</Button>
            ))}
          </div>
        </div>
        <div className="space-y-3 pt-1">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="space-y-1.5 rounded-xl border border-border/60 p-3 bg-secondary/30">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor={`slider-${c.key}`} className="flex items-center gap-1.5 font-medium cursor-pointer"><Icon className={`h-4 w-4 ${c.color}`} /><span>{c.label}</span></Label>
                  <span className="font-bold text-base tabular-nums text-foreground">{percentages[c.key]}%</span>
                </div>
                <input id={`slider-${c.key}`} type="range" min="0" max="100" step="1" aria-label={`Porcentaje para ${c.short}`} value={percentages[c.key]} onChange={(e) => handlePctChange(c.key, Number.parseInt(e.target.value, 10))} className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span>Monto asignado:</span>
                  <span className={`font-semibold text-sm ${c.color}`}>{formatMoney(c.data.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {!split.isValid ? (
          <div role="alert" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>La suma de los porcentajes debe ser 100% (actual: {split.totalPercentage}%). Ajusta los controles para equilibrar el presupuesto.</span>
          </div>
        ) : (
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>Presupuesto balanceado al 100%.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
