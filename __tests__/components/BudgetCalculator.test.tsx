import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetCalculator } from '@/components/budget/BudgetCalculator';

describe('BudgetCalculator', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders default 50/30/20 sliders and updates amounts on income input without network calls', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch'), setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<BudgetCalculator />);

    expect(screen.getByText(/calculadora de presupuesto/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/ingreso mensual/i), '100000');

    expect(screen.getByText(/\$ 50\.000,00|\$50,000\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/\$ 30\.000,00|\$30,000\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/\$ 20\.000,00|\$20,000\.00/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('updates monetary values immediately when slider changes', async () => {
    render(<BudgetCalculator initialIncome="100000" />);
    fireEvent.change(screen.getByLabelText(/necesidades/i), { target: { value: '60' } });
    expect(screen.getByText(/\$ 60\.000,00|\$60,000\.00/i)).toBeInTheDocument();
  });

  it('shows warning when sum of percentages does not equal 100%', async () => {
    render(<BudgetCalculator initialIncome="100000" />);
    fireEvent.change(screen.getByLabelText(/necesidades/i), { target: { value: '60' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/110%/i);
  });

  it('renders exact approved preset buttons (50/30/20, 60/20/20, 40/40/20) and no extra presets', () => {
    render(<BudgetCalculator />);
    expect(screen.getByRole('button', { name: /50\/30\/20/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60\/20\/20/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /40\/40\/20/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /70\/20\/10/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /80\/20\/0/i })).not.toBeInTheDocument();
  });

  it('applies 40/40/20 preset when preset button is clicked', async () => {
    const user = userEvent.setup();
    render(<BudgetCalculator initialIncome="100000" />);
    await user.click(screen.getByRole('button', { name: /40\/40\/20/i }));
    expect(screen.getAllByText(/\$ 40\.000,00|\$40,000\.00/i).length).toBe(2);
    expect(screen.getByText(/\$ 20\.000,00|\$20,000\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/presupuesto balanceado al 100%/i)).toBeInTheDocument();
  });

  it('applies 60/20/20 preset when preset button is clicked', async () => {
    const user = userEvent.setup();
    render(<BudgetCalculator initialIncome="100000" />);
    await user.click(screen.getByRole('button', { name: /60\/20\/20/i }));
    expect(screen.getByText(/\$ 60\.000,00|\$60,000\.00/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$ 20\.000,00|\$20,000\.00/i).length).toBe(2);
  });

  it('handles zero income and single 100% allocation safely', async () => {
    render(<BudgetCalculator initialIncome="0" initialPercentages={{ needs: 100, wants: 0, savings: 0 }} />);
    expect(screen.getAllByText(/\$ 0,00|\$0\.00/i).length).toBe(3);
    expect(screen.getByText(/presupuesto balanceado al 100%/i)).toBeInTheDocument();
  });

  it('displays warning when split is 99% or 101%', () => {
    render(<BudgetCalculator initialIncome="50000" initialPercentages={{ needs: 50, wants: 30, savings: 20 }} />);
    const needsSlider = screen.getByLabelText(/necesidades/i);
    fireEvent.change(needsSlider, { target: { value: '49' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/99%/i);
    fireEvent.change(needsSlider, { target: { value: '51' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/101%/i);
  });
});
