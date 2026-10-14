export type Employment = "Salaried" | "Self-employed" | "Student" | "Business owner" | "Other";
export type Stability = "Stable" | "Variable" | "Seasonal";
export type TransactionType = "income" | "expense";

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  months: number;
  priority: "Essential" | "Important" | "Flexible";
  paused?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
}

export interface FinancialProfile {
  name: string;
  age: number;
  employment: Employment;
  dependants: number;
  income: number;
  otherIncome: number;
  stability: Stability;
  expenses: Record<string, number>;
  assets: {
    cash: number;
    deposits: number;
    investments: number;
    retirement: number;
    other: number;
  };
  debts: {
    balance: number;
    monthlyPayment: number;
    interestRate: number;
    overdue: boolean;
    creditCard: number;
  };
  emergencySavings: number;
  healthCover: number;
  lifeCover: number;
  hasHealthCover: boolean;
  hasLifeCover: boolean;
  goals: Goal[];
  investmentExperience: "None" | "Some" | "Experienced";
  riskCapacity: "Low" | "Medium" | "High";
  riskComfort: "Low" | "Medium" | "High";
  reviewedAt: string;
  consent: boolean;
  transactions: Transaction[];
}

export const expenseCategories = [
  "Housing",
  "Food & groceries",
  "Transport",
  "Utilities",
  "Education",
  "Healthcare",
  "Family support",
  "Loan repayments",
  "Insurance premiums",
  "Investments",
  "Other essentials",
  "Discretionary",
] as const;

export const emptyProfile: FinancialProfile = {
  name: "",
  age: 30,
  employment: "Salaried",
  dependants: 0,
  income: 0,
  otherIncome: 0,
  stability: "Stable",
  expenses: Object.fromEntries(expenseCategories.map((category) => [category, 0])),
  assets: { cash: 0, deposits: 0, investments: 0, retirement: 0, other: 0 },
  debts: { balance: 0, monthlyPayment: 0, interestRate: 0, overdue: false, creditCard: 0 },
  emergencySavings: 0,
  healthCover: 0,
  lifeCover: 0,
  hasHealthCover: false,
  hasLifeCover: false,
  goals: [],
  investmentExperience: "None",
  riskCapacity: "Low",
  riskComfort: "Low",
  reviewedAt: "",
  consent: false,
  transactions: [],
};
