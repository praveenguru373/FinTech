import { describe, expect, it } from "vitest";
import { buildPriorities, calculateMetrics, monthlyGoalContribution } from "./finance";
import { emptyProfile } from "../types";

describe("financial calculations", () => {
  it("handles zero income and marks ratios unavailable", () => {
    const result = calculateMetrics({ ...emptyProfile, expenses: { Housing: 10000 } });
    expect(result.surplus).toBe(-10000);
    expect(result.savingsRate).toBeNull();
    expect(result.debtRatio).toBeNull();
    expect(result.dataWarnings.length).toBeGreaterThan(0);
  });

  it("calculates cash flow, essential expenses, and emergency coverage", () => {
    const result = calculateMetrics({
      ...emptyProfile,
      income: 50000,
      expenses: { Housing: 10000, Food: 5000, Investments: 2000, Discretionary: 3000 },
      emergencySavings: 30000,
    });
    expect(result.totalExpenses).toBe(20000);
    expect(result.surplus).toBe(30000);
    expect(result.essentialExpenses).toBe(15000);
    expect(result.emergencyMonths).toBe(2);
    expect(result.savingsRate).toBe(4);
  });

  it("does not divide by zero for unknown essential expenses", () => {
    const result = calculateMetrics({ ...emptyProfile, income: 10000 });
    expect(result.emergencyMonths).toBeNull();
    expect(result.emergencyTarget).toBe(0);
  });

  it("includes emergency savings in assets and net worth", () => {
    const result = calculateMetrics({
      ...emptyProfile,
      emergencySavings: 20000,
      assets: { ...emptyProfile.assets, cash: 10000 },
      debts: { ...emptyProfile.debts, balance: 5000 },
    });
    expect(result.assets).toBe(30000);
    expect(result.liabilities).toBe(5000);
    expect(result.netWorth).toBe(25000);
  });

  it("prioritizes a cash-flow shortfall and urgent debt", () => {
    const items = buildPriorities({
      ...emptyProfile,
      income: 20000,
      expenses: { Housing: 25000 },
      debts: { ...emptyProfile.debts, overdue: true },
    });
    expect(items[0].title).toContain("shortfall");
    expect(items.some((item) => item.title.includes("overdue"))).toBe(true);
  });

  it("estimates goal savings without assuming returns", () => {
    expect(monthlyGoalContribution({
      id: "g1", name: "Education", target: 120000, saved: 20000, months: 10, priority: "Important",
    })).toBe(10000);
    expect(monthlyGoalContribution({
      id: "g2", name: "Done", target: 100, saved: 150, months: 4, priority: "Flexible",
    })).toBe(0);
  });
});
