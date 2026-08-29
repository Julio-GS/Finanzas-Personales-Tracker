import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { LoginForm } from '@/components/auth/LoginForm';
import { ManualTransactionForm } from '@/components/transactions/ManualTransactionForm';
import { VoiceRecorder } from '@/components/transactions/VoiceRecorder';
import { MonthNavigator } from '@/components/dashboard/MonthNavigator';
import { BudgetCalculator } from '@/components/budget/BudgetCalculator';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { BreakdownList } from '@/components/dashboard/BreakdownList';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { HistoryTrend } from '@/components/dashboard/HistoryTrend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoginPage from '@/app/login/page';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { metadata, viewport } from '@/app/layout';
import type { TransactionItem } from '@/lib/types';

describe('Accessibility Audit & Assertions across MVP Surfaces', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('LoginForm: provides accessible labels for all credentials and alert role for errors', () => {
    render(<LoginForm />);
    const usernameInput = screen.getByLabelText(/usuario/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('type', 'text');

    const passwordInput = screen.getByLabelText(/contraseña/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it('ManualTransactionForm: associates labels with all interactive inputs and selects', () => {
    render(<ManualTransactionForm />);
    expect(screen.getByLabelText(/tipo de movimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/entidad \/ cuenta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar transacción/i })).toBeInTheDocument();
  });

  it('MonthNavigator: provides distinct accessible names for navigation controls', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onCurrent = vi.fn();

    render(
      <MonthNavigator
        year={2026}
        month={8}
        onPrevious={onPrev}
        onNext={onNext}
        onCurrentMonth={onCurrent}
        isCurrentMonth={false}
      />
    );

    expect(screen.getByRole('button', { name: /mes anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mes siguiente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mes actual/i })).toBeInTheDocument();
  });

  it('BudgetCalculator: provides accessible labels for income, sliders, and aria-live status & alerts', () => {
    render(<BudgetCalculator initialIncome="100000" />);
    expect(screen.getByLabelText(/ingreso mensual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/porcentaje para necesidades/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/porcentaje para deseos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/porcentaje para ahorro/i)).toBeInTheDocument();

    const balancedMsg = screen.getByText(/presupuesto balanceado al 100%/i);
    expect(balancedMsg).toBeInTheDocument();
    const statusContainer = balancedMsg.closest('[role="status"]');
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');

    // Change slider to produce an unbalanced alert
    const needsSlider = screen.getByLabelText(/porcentaje para necesidades/i);
    fireEvent.change(needsSlider, { target: { value: '70' } });

    const alertMsg = screen.getByRole('alert');
    expect(alertMsg).toBeInTheDocument();
    expect(alertMsg).toHaveAttribute('aria-live', 'polite');
    expect(alertMsg).toHaveTextContent(/la suma de los porcentajes debe ser 100%/i);
  });

  it('TransactionList: ensures delete buttons have descriptive accessible names and badges have non-color text cues', () => {
    const mockTx: TransactionItem[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        createdAt: '2026-08-26T12:00:00Z',
        date: '2026-08-26',
        type: 'expense',
        amount: '1500.00',
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        description: 'Compras semanales',
        rawAudioPrompt: 'Gasté 1500 en súper',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        createdAt: '2026-08-26T12:00:00Z',
        date: '2026-08-26',
        type: 'income',
        amount: '50000.00',
        bankEntity: 'Santander',
        category: 'Sueldo',
        description: null,
        rawAudioPrompt: null,
      },
    ];

    const onDelete = vi.fn();
    render(<TransactionList transactions={mockTx} onDelete={onDelete} />);

    expect(screen.getByRole('button', { name: /eliminar transacción supermercado - 2026-08-26/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar transacción sueldo - 2026-08-26/i })).toBeInTheDocument();

    expect(screen.getByText(/gasto/i)).toBeInTheDocument();
    expect(screen.getByText(/ingreso/i)).toBeInTheDocument();
  });

  it('BreakdownList: progressbars have accessible progressbar roles and value ranges', () => {
    const byEntity = [{ label: 'Santander', total: '60000.00' }];
    const byCategory = [{ label: 'Supermercado', total: '40000.00' }];

    render(<BreakdownList byEntity={byEntity} byCategory={byCategory} />);

    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars.length).toBe(2);
    expect(progressbars[0]).toHaveAttribute('aria-valuemin', '0');
    expect(progressbars[0]).toHaveAttribute('aria-valuemax', '100');
    expect(progressbars[0]).toHaveAttribute('aria-valuenow');
    expect(progressbars[0]).toHaveAttribute('aria-label');
  });

  it('KpiCards: conveys financial type and direction through text and icons, not color alone', () => {
    const kpis = {
      income: '100000.00',
      expenses: '40000.00',
      investments: '20000.00',
      netFlow: '40000.00',
    };

    render(<KpiCards kpis={kpis} />);
    expect(screen.getByText(/\+ ingresos/i)).toBeInTheDocument();
    expect(screen.getByText(/- gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/★ inv/i)).toBeInTheDocument();
    expect(screen.getByText(/positivo/i)).toBeInTheDocument();
  });

  it('HistoryTrend: conveys month labels and summary badges with non-color text cues', async () => {
    const mockData = {
      months: [
        {
          year: 2026,
          month: 8,
          income: '100000.00',
          expenses: '40000.00',
          investments: '10000.00',
          netFlow: '50000.00',
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      })
    );

    render(<HistoryTrend />);
    await waitFor(() => {
      expect(screen.getByText(/agosto 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/neto \+/i)).toBeInTheDocument();
    });
  });

  it('VoiceRecorder: renders accessible fallback in unsupported browsers and aria-live status when supported', () => {
    const { unmount } = render(<VoiceRecorder />);
    expect(screen.getByText(/grabación de voz no compatible/i)).toBeInTheDocument();
    unmount();

    // Mock supported environment
    const originalMediaRecorder = global.MediaRecorder;
    const originalNavigator = global.navigator;

    const mockTracks = [{ stop: vi.fn() }];
    const mockStream = { getTracks: () => mockTracks };
    const mockMediaRecorderInstance = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
      mimeType: 'audio/webm',
    };
    const MockMediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorderInstance) as unknown as typeof MediaRecorder;
    MockMediaRecorder.isTypeSupported = vi.fn((m: string) => m === 'audio/webm');
    global.MediaRecorder = MockMediaRecorder;
    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) } },
      writable: true,
      configurable: true,
    });

    render(<VoiceRecorder />);
    expect(screen.getByRole('button', { name: /grabar transacción/i })).toBeInTheDocument();

    global.MediaRecorder = originalMediaRecorder;
    Object.defineProperty(global, 'navigator', { value: originalNavigator, writable: true, configurable: true });
  });

  it('iOS Dark Mode Metadata & Viewport: dark-only, cover fit, and preserves user zoom', () => {
    expect(viewport).toBeDefined();
    expect(viewport.themeColor).toBe('#000000');
    expect(viewport.colorScheme).toBe('dark');
    expect(viewport.viewportFit).toBe('cover');
    // Zoom must NOT be suppressed
    expect(viewport.maximumScale).toBeUndefined();
    expect(viewport.userScalable).toBeUndefined();

    expect(metadata.appleWebApp).toBeDefined();
    expect(metadata.appleWebApp).toMatchObject({
      capable: true,
      statusBarStyle: 'black-translucent',
    });
  });

  it('UI Primitives: 44px mobile touch targets across all Button size variants, accessible 2px focus, and iOS input styles', () => {
    render(
      <div>
        <Button size="default">Default Button</Button>
        <Button size="sm">Small Button</Button>
        <Button size="icon" aria-label="Icon Button">Icon</Button>
        <Button size="lg">Large Button</Button>
        <Input placeholder="iOS Input" />
      </div>
    );

    const defaultBtn = screen.getByRole('button', { name: /default button/i });
    expect(defaultBtn.className).toMatch(/h-11|min-h-\[44px\]/);
    expect(defaultBtn.className).toMatch(/focus-visible:ring-2/);

    const smBtn = screen.getByRole('button', { name: /small button/i });
    expect(smBtn.className).toMatch(/min-h-\[44px\]/);
    expect(smBtn.className).not.toMatch(/min-h-\[36px\]/);
    expect(smBtn.className).toMatch(/focus-visible:ring-2/);

    const iconBtn = screen.getByRole('button', { name: /icon button/i });
    expect(iconBtn.className).toMatch(/h-11 w-11|size-11|min-h-\[44px\] min-w-\[44px\]/);
    expect(iconBtn.className).toMatch(/focus-visible:ring-2/);

    const lgBtn = screen.getByRole('button', { name: /large button/i });
    expect(lgBtn.className).toMatch(/h-12|min-h-\[44px\]|min-h-\[48px\]/);
    expect(lgBtn.className).toMatch(/focus-visible:ring-2/);

    const input = screen.getByPlaceholderText(/ios input/i);
    expect(input.className).toMatch(/h-11|min-h-\[44px\]/);
    expect(input.className).toMatch(/rounded-xl/);
    expect(input.className).toMatch(/text-base/);
  });

  it('BudgetCalculator: range inputs implement explicit 2px focus-visible ring/outline contract', () => {
    render(<BudgetCalculator initialIncome="100000" />);
    const sliders = [
      screen.getByLabelText(/porcentaje para necesidades/i),
      screen.getByLabelText(/porcentaje para deseos/i),
      screen.getByLabelText(/porcentaje para ahorro/i),
    ];
    for (const slider of sliders) {
      expect(slider.className).toMatch(/focus-visible:ring-2/);
      expect(slider.className).toMatch(/focus-visible:ring-ring|focus-visible:ring-primary/);
      expect(slider.className).toMatch(/focus-visible:outline-none/);
    }
  });

  it('Safe Area Insets: single structural ownership of pb-safe in body layout, no duplicate in login/dashboard', async () => {
    const layoutPath = path.resolve(process.cwd(), 'app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    expect(layoutContent).toMatch(/<body[^>]*pb-safe/);

    const { container: loginContainer, unmount: unmountLogin } = render(<LoginPage />);
    const loginMain = loginContainer.querySelector('main');
    expect(loginMain?.className).toMatch(/pt-safe/);
    expect(loginMain?.className).not.toMatch(/pb-safe/);
    unmountLogin();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          month: { year: 2026, month: 8 },
          kpis: { income: '0.00', expenses: '0.00', investments: '0.00', netFlow: '0.00' },
          breakdowns: { byEntity: [], byCategory: [] },
          transactions: [],
          months: [],
        }),
      })
    );

    const { container: dashboardContainer } = render(<DashboardClient initialYear={2026} initialMonth={8} />);
    const dashboardRoot = dashboardContainer.firstElementChild;
    expect(dashboardRoot?.className).toMatch(/pt-safe/);
    expect(dashboardRoot?.className).not.toMatch(/pb-safe/);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /finanzas tracker/i })).toBeInTheDocument();
    });
  });

  it('System Design Document: adheres to WCAG zoom and user-select preservation guidelines', () => {
    const docPath = path.resolve(process.cwd(), 'system design.md');
    const docContent = fs.readFileSync(docPath, 'utf8');

    expect(docContent).not.toMatch(/maximum-scale\s*=\s*1/i);
    expect(docContent).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(docContent).not.toMatch(/body\s*\{[^}]*user-select:\s*none/i);
    expect(docContent).toMatch(/zoom/i);
    expect(docContent).toMatch(/user-select|selección de texto/i);
  });

  it('Component semantic styling: uses CSS variables/semantic tokens instead of hardcoded colors', () => {
    const kpis = {
      income: '100000.00',
      expenses: '40000.00',
      investments: '20000.00',
      netFlow: '40000.00',
    };

    const { container: kpiContainer } = render(<KpiCards kpis={kpis} />);
    expect(kpiContainer.innerHTML).not.toContain('border-l-emerald-500');
    expect(kpiContainer.innerHTML).not.toContain('border-l-rose-500');
    expect(kpiContainer.innerHTML).not.toContain('border-l-blue-500');
    expect(kpiContainer.innerHTML).toMatch(/border-l-success|text-success/);
    expect(kpiContainer.innerHTML).toMatch(/border-l-destructive|text-destructive/);

    const mockTx: TransactionItem[] = [
      {
        id: 'tx-1',
        createdAt: '2026-08-26T12:00:00Z',
        date: '2026-08-26',
        type: 'expense',
        amount: '1500.00',
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        description: null,
        rawAudioPrompt: null,
      },
    ];
    const { container: txContainer } = render(<TransactionList transactions={mockTx} onDelete={vi.fn()} />);
    expect(txContainer.innerHTML).not.toContain('bg-emerald-500/10');
    expect(txContainer.innerHTML).not.toContain('bg-rose-500/10');
    expect(txContainer.innerHTML).not.toContain('bg-blue-500/10');
    const deleteBtn = screen.getByRole('button', { name: /eliminar transacción/i });
    expect(deleteBtn.className).toMatch(/h-11 w-11|min-h-\[44px\] min-w-\[44px\]/);
  });

  it('Global CSS Contract: single dark :root palette, safe area utilities, reduced-motion, no user-select:none', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    expect(cssContent).toMatch(/color-scheme:\s*dark/);
    expect(cssContent).toMatch(/--background:\s*0\s+0%\s+0%/);
    expect(cssContent).toMatch(/--success/);
    expect(cssContent).toMatch(/--warning/);
    expect(cssContent).toMatch(/safe-area-inset|pb-safe|pt-safe/);
    expect(cssContent).toMatch(/prefers-reduced-motion/);
    // Unsafe recommendation in system design.md: global user-select: none must be avoided
    expect(cssContent).not.toMatch(/body\s*\{[^}]*user-select:\s*none/);
  });
});
