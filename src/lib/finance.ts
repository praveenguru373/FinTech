import type { FinancialProfile, Goal } from "../types";

export const money = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const safeNumber = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export interface FinancialMetrics {
  totalIncome: number;
  totalExpenses: number;
  essentialExpenses: number;
  surplus: number;
  savingsRate: number | null;
  emergencyMonths: number | null;
  emergencyTarget: number;
  emergencyGap: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  debtRatio: number | null;
  availableMonthlySurplus: number;
  dataWarnings: string[];
}

export function calculateMetrics(profile: FinancialProfile): FinancialMetrics {
  const totalIncome = roundMoney(safeNumber(profile.income) + safeNumber(profile.otherIncome));
  const expenseValues = Object.values(profile.expenses);
  const totalExpenses = roundMoney(expenseValues.reduce((sum, amount) => sum + safeNumber(amount), 0));
  const essentialExpenses = roundMoney(
    Object.entries(profile.expenses)
      .filter(([category]) => category !== "Discretionary" && category !== "Investments")
      .reduce((sum, [, amount]) => sum + safeNumber(amount), 0),
  );
  const monthlyInvestment = safeNumber(profile.expenses.Investments);
  const surplus = roundMoney(totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? roundMoney(monthlyInvestment / totalIncome * 100) : null;
  const emergencyMonths =
    essentialExpenses > 0 ? roundMoney(safeNumber(profile.emergencySavings) / essentialExpenses) : null;
  const emergencyTarget = roundMoney(essentialExpenses * (profile.stability === "Stable" ? 3 : 6));
  const emergencyGap = roundMoney(Math.max(0, emergencyTarget - safeNumber(profile.emergencySavings)));
  const assets = roundMoney(
    safeNumber(profile.emergencySavings) +
      Object.values(profile.assets).reduce((sum, amount) => sum + safeNumber(amount), 0),
  );
  const liabilities = roundMoney(safeNumber(profile.debts.balance) + safeNumber(profile.debts.creditCard));
  const debtRatio =
    totalIncome > 0 ? roundMoney(safeNumber(profile.debts.monthlyPayment) / totalIncome * 100) : null;
  const dataWarnings: string[] = [];

  if (totalIncome === 0) dataWarnings.push("Monthly income is missing, so savings and debt ratios are unavailable.");
  if (expenseValues.every((value) => safeNumber(value) === 0)) {
    dataWarnings.push("Monthly expenses have not been entered; cash-flow and emergency targets may be incomplete.");
  }
  if (profile.debts.balance > 0 && profile.debts.interestRate === 0) {
    dataWarnings.push("Debt interest rates are unknown; cost-based repayment priorities may change.");
  }
  if (profile.stability !== "Stable") {
    dataWarnings.push("Income varies, so monthly averages may not capture low-income months.");
  }

  return {
    totalIncome,
    totalExpenses,
    essentialExpenses,
    surplus,
    savingsRate,
    emergencyMonths,
    emergencyTarget,
    emergencyGap,
    assets,
    liabilities,
    netWorth: roundMoney(assets - liabilities),
    debtRatio,
    availableMonthlySurplus: Math.max(0, surplus),
    dataWarnings,
  };
}

export interface Recommendation {
  title: string;
  reason: string;
  action: string;
  horizon: string;
  confidence: "High" | "Medium" | "Low";
  amount?: number;
  tradeoff: string;
}

export function buildPriorities(profile: FinancialProfile): Recommendation[] {
  const metrics = calculateMetrics(profile);
  const recommendations: Recommendation[] = [];

  if (metrics.totalIncome === 0) {
    recommendations.push({
      title: "Complete your income picture",
      reason: "Income information is missing, so affordability and savings guidance would be unreliable.",
      action: "Add an estimated monthly take-home income, including a conservative average if it varies.",
      horizon: "When convenient",
      confidence: "High",
      tradeoff: "An estimate is useful for planning but will not reflect every month.",
    });
  } else if (metrics.surplus < 0) {
    recommendations.push({
      title: "Understand the monthly shortfall",
      reason: `Your entered expenses are ${money(Math.abs(metrics.surplus))} above your monthly income.`,
      action: "Review essential bills, debt payments, and flexible spending; look for safe income or cost adjustments before adding new contributions.",
      horizon: "This week",
      confidence: "High",
      tradeoff: "Avoid cutting essential healthcare, food, or contractual payments without a safe alternative.",
    });
  }

  if (profile.debts.overdue || profile.debts.creditCard > 0) {
    recommendations.push({
      title: profile.debts.overdue ? "Address overdue payments" : "Review high-cost balances",
      reason: profile.debts.overdue
        ? "You reported overdue obligations, which may attract fees and create additional stress."
        : "Credit-card balances can carry high interest; your actual rate and due date determine urgency.",
      action: "Check due dates, minimum payments, interest rates, and contact the lender promptly if a payment is difficult.",
      horizon: "As soon as possible",
      confidence: profile.debts.overdue ? "High" : "Medium",
      amount: profile.debts.creditCard || undefined,
      tradeoff: "Keep enough cash for essential needs; do not ignore contractual payments.",
    });
  } else if (profile.debts.balance > 0 && profile.debts.interestRate >= 12) {
    recommendations.push({
      title: "Compare the cost of your debt",
      reason: `You entered an interest rate of ${profile.debts.interestRate}% on outstanding debt.`,
      action: "Compare the confirmed borrowing cost with your other priorities and review any prepayment fees before paying extra.",
      horizon: "This month",
      confidence: "Medium",
      tradeoff: "Using savings to repay debt can reduce liquidity; check terms before making a lump-sum payment.",
    });
  }

  if (metrics.essentialExpenses > 0 && metrics.emergencyGap > 0) {
    const contribution = Math.min(metrics.emergencyGap, Math.max(0, metrics.surplus) * 0.5);
    recommendations.push({
      title: "Build accessible emergency savings",
      reason: `Your entered emergency savings cover about ${metrics.emergencyMonths ?? 0} month(s) of essential expenses; a 3–6 month reference is educational, not a rule.`,
      action:
        contribution > 0
          ? `If affordable after essentials and due payments, consider setting aside up to ${money(contribution)} monthly and adjust when income changes.`
          : "First address cash flow or identify a sustainable amount; do not force a contribution that makes essentials unaffordable.",
      horizon: "Over the next 3–6 months",
      confidence: "Medium",
      amount: contribution || undefined,
      tradeoff: "Accessible savings may grow more slowly than long-term investments, but are easier to use in an emergency.",
    });
  }

  if (profile.dependants > 0 && (!profile.hasHealthCover || !profile.hasLifeCover)) {
    const missing = [
      !profile.hasHealthCover ? "health coverage" : "",
      !profile.hasLifeCover ? "whether life cover is relevant" : "",
    ].filter(Boolean).join(" and ");
    recommendations.push({
      title: "Review family protection",
      reason: `You reported ${profile.dependants} dependant(s) and have not confirmed ${missing}.`,
      action: "Review policy terms, employer cover portability, exclusions, existing cover, liabilities, and affordability before deciding whether to change anything.",
      horizon: "This month",
      confidence: "Medium",
      tradeoff: "This is a prompt to review, not a conclusion that you need a particular product or amount.",
    });
  }

  if (profile.goals.length > 0) {
    const goal = profile.goals.find((item) => !item.paused && item.target > item.saved);
    if (goal) {
      const monthly = monthlyGoalContribution(goal);
      recommendations.push({
        title: `Plan for ${goal.name}`,
        reason: `The goal has ${money(Math.max(0, goal.target - goal.saved))} remaining based on the amounts you entered.`,
        action: monthly > 0
          ? `A no-return estimate is ${money(monthly)} per month for the time entered. Review the target or timeline if this does not fit your budget.`
          : "Add a target date and amount to estimate a monthly contribution.",
        horizon: `${goal.months} months`,
        confidence: goal.months > 0 ? "Medium" : "Low",
        amount: monthly || undefined,
        tradeoff: "This estimate assumes no investment return and excludes fees, inflation, and changing contributions.",
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Review your goals and investments",
      reason: "Your entered information does not show an immediate cash-flow, overdue debt, or emergency savings gap.",
      action: "Check whether savings are aligned with goal dates, liquidity needs, and your ability to tolerate losses.",
      horizon: "This month",
      confidence: "Low",
      tradeoff: "Missing or estimated information could change this assessment.",
    });
  }
  return recommendations;
}

export function monthlyGoalContribution(goal: Goal): number {
  if (goal.months <= 0 || goal.target <= goal.saved) return 0;
  return roundMoney((goal.target - goal.saved) / goal.months);
}
