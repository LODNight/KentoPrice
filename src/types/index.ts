export type TransactionType = 'expense' | 'income';
export type CategoryType = 'expense' | 'income';
export type BudgetMode = 'rollover' | 'reset';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Amount in whole integer VND (> 0) */
  amount: number;
  categoryId: string;
  /** Calendar date YYYY-MM-DD */
  transactionDate: string;
  note?: string;
  /** Optional 0..1 reference to Fund.id */
  fundId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Fund {
  /** Unique fund identifier */
  id: string;
  /** Human-readable fund name in Vietnamese (unique among active funds) */
  name: string;
  /** Lucide SVG icon identifier */
  icon: string;
  /** Semantic color hex or token */
  color: string;
  /** Soft-delete flag */
  isArchived: boolean;
  /** Display order */
  order: number;
  /** Baseline default monthly budget in integer VND (>= 0) */
  defaultBudget: number;
  /** Baseline default budget calculation mode */
  defaultMode: BudgetMode;
  createdAt: string;
  updatedAt: string;
}

export interface FundMonthlyConfig {
  /** Composite key `${fundId}_${yearMonth}` */
  id: string;
  fundId: string;
  /** Calendar month format 'YYYY-MM' */
  yearMonth: string;
  /** Budget in integer VND (>= 0) */
  monthlyBudget: number;
  /** Calculation mode for this month */
  budgetMode: BudgetMode;
  updatedAt: string;
}

export interface FundMonthlySummary {
  fundId: string;
  fundName: string;
  fundIcon: string;
  fundColor: string;
  isArchived: boolean;
  yearMonth: string;
  /** Opening balance from previous month */
  openingBalance: number;
  /** Effective budget allocated for this month */
  monthlyBudget: number;
  /** Effective budget mode for this month */
  budgetMode: BudgetMode;
  /** Total expenses in this month */
  monthlySpending: number;
  /** Current or closing balance: openingBalance + monthlyBudget - monthlySpending */
  currentBalance: number;
  /** Spending percentage: Math.round((spending / budget) * 100) or 0 if budget is 0 */
  spendingPercentage: number;
  /** Flag indicating overdraft */
  isOverBudget: boolean;
  /** Number of transactions assigned to this fund */
  transactionCount: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  order: number;
  createdAt: string;
}

export type PeriodType = 'month' | 'custom';

export interface PeriodFilter {
  type: PeriodType;
  year: number;
  month: number; // 1 - 12
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface SummaryReport {
  period: PeriodFilter;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  expenseBreakdown: CategoryBreakdown[];
  incomeBreakdown: CategoryBreakdown[];
  transactionCount: number;
}
