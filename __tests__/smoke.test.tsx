import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import HomePage from "@/app/page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

describe("Scaffold Smoke Test", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({
        month: { year: 2026, month: 8, start: "2026-08-01", endExclusive: "2026-09-01" },
        kpis: { income: "0.00", expenses: "0.00", investments: "0.00", netFlow: "0.00" },
        breakdowns: { byEntity: [], byCategory: [] }, transactions: [],
      }),
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("renders the home page headline and description", async () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Finanzas Tracker" })).toBeInTheDocument();
    expect(screen.getByText("Voice-first personal finance & investment tracker")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    });
  });

  it("renders shadcn UI primitives properly", () => {
    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="test-input">Test Label</Label>
          <Input id="test-input" placeholder="Type here" />
          <Button variant="default">Click Me</Button>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId("test-card")).toBeInTheDocument();
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /click me/i })
    ).toBeInTheDocument();
  });

  it("handles button variants, disabled state and class merging", () => {
    render(
      <Button variant="destructive" size="sm" disabled className="custom-test-class">
        Delete
      </Button>
    );

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-destructive", "custom-test-class");
  });

  it("merges classes correctly via cn utility", () => {
    const merged = cn("px-2 py-1", "bg-red-500", { "text-white": true, "hidden": false });
    expect(merged).toContain("px-2");
    expect(merged).toContain("bg-red-500");
    expect(merged).toContain("text-white");
    expect(merged).not.toContain("hidden");
  });
});
