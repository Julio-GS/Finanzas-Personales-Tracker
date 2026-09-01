'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatIsoDate } from '@/lib/dates';
import { ALLOWED_ACCOUNTS } from '@/lib/accounts';
import type { MovementType } from '@/lib/types';
import { PenTool, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ManualTransactionFormProps {
  onSuccess?: () => void | Promise<void>;
  defaultType?: MovementType;
}

function formatIntegerDigits(digits: string): string {
  if (!digits) return '';
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCurrencyInput(value: string): string {
  if (!value || !value.trim()) return '';

  const isNegative = value.trim().startsWith('-');
  const clean = value.replace(/[$]/g, '').trim().replace(/^-/, '');
  if (!clean) return isNegative ? '-$ ' : '';

  const prefix = isNegative ? '-$ ' : '$ ';

  if (clean.includes(',')) {
    const parts = clean.split(',');
    const integerDigits = parts[0].replace(/\D/g, '');
    const decimalDigits = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
    const formattedInt = formatIntegerDigits(integerDigits) || '0';
    return `${prefix}${formattedInt},${decimalDigits}`;
  }

  if (clean.endsWith('.')) {
    const integerDigits = clean.slice(0, -1).replace(/\D/g, '');
    const formattedInt = formatIntegerDigits(integerDigits) || '0';
    return `${prefix}${formattedInt},`;
  }

  if (!value.includes('$')) {
    const dotParts = clean.split('.');
    if (dotParts.length === 2 && (dotParts[1].length === 1 || dotParts[1].length === 2)) {
      const integerDigits = dotParts[0].replace(/\D/g, '');
      const decimalDigits = dotParts[1].replace(/\D/g, '').slice(0, 2);
      const formattedInt = formatIntegerDigits(integerDigits) || '0';
      return `${prefix}${formattedInt},${decimalDigits}`;
    }
  }

  const allDigits = clean.replace(/\D/g, '');
  if (!allDigits) return '';
  const formattedInt = formatIntegerDigits(allDigits);
  if (!formattedInt) return '';
  return `${prefix}${formattedInt}`;
}

export function parseCurrencyToNumber(value: string): number {
  if (!value || !value.trim()) return NaN;
  const isNegative = value.trim().startsWith('-');
  const clean = value
    .replace(/[$]/g, '')
    .trim()
    .replace(/^-/, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!clean || clean === '.') return NaN;
  const num = Number.parseFloat(clean);
  if (!Number.isFinite(num)) return NaN;
  return isNegative ? -num : num;
}

export function ManualTransactionForm({
  onSuccess,
  defaultType = 'expense',
}: ManualTransactionFormProps): React.JSX.Element {
  const [type, setType] = useState<MovementType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [bankEntity, setBankEntity] = useState<string>('');
  const [destinationBankEntity, setDestinationBankEntity] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(formatIsoDate(new Date()));
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setType(defaultType);
    setAmount('');
    setBankEntity('');
    setDestinationBankEntity('');
    setCategory('');
    setDate(formatIsoDate(new Date()));
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const parsedAmount = parseCurrencyToNumber(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Ingrese un monto válido mayor a 0');
      return;
    }

    if (type === 'transfer') {
      if (!bankEntity.trim()) {
        setErrorMessage('La cuenta de origen es requerida');
        return;
      }
      if (!destinationBankEntity.trim()) {
        setErrorMessage('La cuenta de destino es requerida');
        return;
      }
      if (bankEntity.trim() === destinationBankEntity.trim()) {
        setErrorMessage('La cuenta de origen y destino deben ser distintas');
        return;
      }
    } else {
      if (!bankEntity.trim()) {
        setErrorMessage('La entidad o cuenta es requerida');
        return;
      }
      if (!category.trim()) {
        setErrorMessage('La categoría es requerida');
        return;
      }
    }

    if (!date) {
      setErrorMessage('La fecha es requerida');
      return;
    }

    setIsLoading(true);
    try {
      const payload =
        type === 'transfer'
          ? {
              type,
              amount: parsedAmount,
              bankEntity: bankEntity.trim(),
              destinationBankEntity: destinationBankEntity.trim(),
              category: 'Transferencia',
              date,
              description: description.trim() || undefined,
            }
          : {
              type,
              amount: parsedAmount,
              bankEntity: bankEntity.trim(),
              category: category.trim(),
              date,
              description: description.trim() || undefined,
            };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(
          data?.error?.message ??
            'Error al registrar la transacción. Intente nuevamente.'
        );
        return;
      }

      resetForm();
      setSuccessMessage('Transacción registrada correctamente');
      if (onSuccess) await onSuccess();
    } catch {
      setErrorMessage('Error de conexión al guardar la transacción.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <PenTool className="h-4 w-4 text-muted-foreground" /> Registro Manual
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/25"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl bg-success/15 p-3 text-sm text-success font-medium border border-success/25"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-type">Tipo de movimiento</Label>
              <select
                id="tx-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                disabled={isLoading}
                className="flex h-11 w-full rounded-xl border border-input/60 bg-secondary/40 px-3.5 py-2 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
                <option value="investment">Inversión</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Monto</Label>
              <Input
                id="tx-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="$ 0,00"
                value={amount}
                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-bank-entity">
                {type === 'transfer' ? 'Cuenta de origen' : 'Entidad / Cuenta'}
              </Label>
              <select
                id="tx-bank-entity"
                name="bankEntity"
                required
                value={bankEntity}
                onChange={(e) => setBankEntity(e.target.value)}
                disabled={isLoading}
                className="flex h-11 w-full rounded-xl border border-input/60 bg-secondary/40 px-3.5 py-2 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">
                  {type === 'transfer'
                    ? 'Seleccione cuenta de origen'
                    : 'Seleccione una entidad / cuenta'}
                </option>
                {ALLOWED_ACCOUNTS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
            {type === 'transfer' ? (
              <div className="space-y-1.5">
                <Label htmlFor="tx-dest-bank-entity">Cuenta de destino</Label>
                <select
                  id="tx-dest-bank-entity"
                  name="destinationBankEntity"
                  required
                  value={destinationBankEntity}
                  onChange={(e) => setDestinationBankEntity(e.target.value)}
                  disabled={isLoading}
                  className="flex h-11 w-full rounded-xl border border-input/60 bg-secondary/40 px-3.5 py-2 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="">Seleccione cuenta de destino</option>
                  {ALLOWED_ACCOUNTS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="tx-category">Categoría</Label>
                <Input
                  id="tx-category"
                  name="category"
                  type="text"
                  required
                  placeholder="Ej. Supermercado, Alquiler, Salidas"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-description">Descripción (opcional)</Label>
              <Input
                id="tx-description"
                name="description"
                type="text"
                placeholder="Detalle o nota adicional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full sm:w-auto min-h-[44px]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              'Guardar transacción'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
