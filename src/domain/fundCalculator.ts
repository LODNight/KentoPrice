import type { Fund, FundMonthlyConfig, FundMonthlySummary, BudgetMode, Transaction } from '../types';
import { getYearMonthSequence } from '../utils/date';

/**
 * Calculates the opening balance for a target month based on the previous month's closing balance
 * and the target month's calculation mode (PDR-022 Target-Month Rule).
 *
 * Rules:
 * - If target month mode is 'rollover': inherits previousClosingBalance completely (positive, negative, or zero).
 * - If target month mode is 'reset': opening balance is strictly 0 ₫.
 */
export function calculateTargetMonthOpeningBalance(
  previousClosingBalance: number,
  targetMonthMode: BudgetMode
): number {
  if (targetMonthMode === 'rollover') {
    return previousClosingBalance;
  }
  return 0;
}

/**
 * Resolves the effective budget and mode for a fund in a specific month.
 * If a custom monthly config exists, uses its values; otherwise falls back to the fund's defaults.
 */
export function getEffectiveMonthConfig(
  fund: Fund,
  config?: FundMonthlyConfig | null
): { budget: number; mode: BudgetMode } {
  if (config) {
    return {
      budget: config.monthlyBudget,
      mode: config.budgetMode,
    };
  }
  return {
    budget: fund.defaultBudget,
    mode: fund.defaultMode,
  };
}

/**
 * Filters and sums all expense transactions belonging to a specific fund within a calendar month.
 * @param transactions All transactions or period transactions
 * @param fundId Target fund ID
 * @param yearMonth Format 'YYYY-MM'
 */
export function calculateFundSpending(
  transactions: Transaction[],
  fundId: string,
  yearMonth: string
): { totalSpending: number; count: number } {
  let totalSpending = 0;
  let count = 0;

  for (const txn of transactions) {
    if (txn.fundId === fundId && txn.transactionDate.startsWith(yearMonth)) {
      count++;
      if (txn.type === 'expense') {
        totalSpending += txn.amount;
      }
    }
  }

  return { totalSpending, count };
}

export interface CalculateFundSummaryParams {
  fund: Fund;
  yearMonth: string;
  monthlyConfig?: FundMonthlyConfig | null;
  transactions: Transaction[];
  previousClosingBalance?: number;
}

/**
 * Pure function to calculate the derived monthly summary for a single fund in a specific month.
 * In accordance with PDR-010, PDR-011, PDR-017, and PDR-022:
 * Current Balance = Opening Balance + Monthly Budget - Monthly Spending
 */
export function calculateFundSummary({
  fund,
  yearMonth,
  monthlyConfig,
  transactions,
  previousClosingBalance = 0,
}: CalculateFundSummaryParams): FundMonthlySummary {
  const { budget: monthlyBudget, mode: budgetMode } = getEffectiveMonthConfig(fund, monthlyConfig);

  const openingBalance = calculateTargetMonthOpeningBalance(previousClosingBalance, budgetMode);
  const { totalSpending: monthlySpending, count: transactionCount } = calculateFundSpending(
    transactions,
    fund.id,
    yearMonth
  );

  const currentBalance = openingBalance + monthlyBudget - monthlySpending;
  const isOverBudget = currentBalance < 0;

  const spendingPercentage =
    monthlyBudget > 0 ? Math.round((monthlySpending / monthlyBudget) * 100) : 0;

  return {
    fundId: fund.id,
    fundName: fund.name,
    fundIcon: fund.icon,
    fundColor: fund.color,
    isArchived: fund.isArchived,
    yearMonth,
    openingBalance,
    monthlyBudget,
    budgetMode,
    monthlySpending,
    currentBalance,
    spendingPercentage,
    isOverBudget,
    transactionCount,
  };
}

export interface CalculateHistoricalSummariesParams {
  fund: Fund;
  sortedMonths: string[]; // Chronologically sorted 'YYYY-MM', e.g. ['2026-08', '2026-09', '2026-10']
  monthlyConfigs: Map<string, FundMonthlyConfig>;
  transactions: Transaction[];
  initialOpeningBalance?: number; // Opening balance before the first month in sortedMonths
}

/**
 * Calculates a sequential chain of monthly summaries for a fund across multiple chronological months.
 * Guarantees deterministic Target-Month rollover linking across all months.
 */
export function calculateHistoricalFundSummaries({
  fund,
  sortedMonths,
  monthlyConfigs,
  transactions,
  initialOpeningBalance = 0,
}: CalculateHistoricalSummariesParams): Map<string, FundMonthlySummary> {
  const resultMap = new Map<string, FundMonthlySummary>();
  let runningPreviousClosingBalance = initialOpeningBalance;

  for (const month of sortedMonths) {
    const config = monthlyConfigs.get(`${fund.id}_${month}`) || monthlyConfigs.get(month);
    const summary = calculateFundSummary({
      fund,
      yearMonth: month,
      monthlyConfig: config,
      transactions,
      previousClosingBalance: runningPreviousClosingBalance,
    });

    resultMap.set(month, summary);
    runningPreviousClosingBalance = summary.currentBalance;
  }

  return resultMap;
}

export interface CascadeRecalculationParams {
  fund: Fund;
  mutatedMonth: string; // The month in which a transaction was added/edited/deleted
  subsequentSortedMonths: string[]; // Consecutive months strictly after mutatedMonth
  monthlyConfigs: Map<string, FundMonthlyConfig>;
  transactions: Transaction[];
  previousClosingBalanceOfMutatedMonth?: number; // Closing balance of month prior to mutatedMonth
}

export interface CascadeRecalculationResult {
  updatedSummaries: Map<string, FundMonthlySummary>;
  stoppedAtMonth?: string; // Month where reset mode stopped the cascade, if any
}

/**
 * Performs cascade recalculation when a historical transaction is mutated (PDR-019 Confirmed).
 *
 * Rules:
 * 1. Recalculates mutatedMonth with existing historical budget/mode.
 * 2. Propagates new closing balance to subsequent months if they use 'rollover'.
 * 3. If a subsequent month uses 'reset', its opening balance is 0 ₫ and the cascade stops propagating further.
 */
export function calculateCascadeRecalculation({
  fund,
  mutatedMonth,
  subsequentSortedMonths,
  monthlyConfigs,
  transactions,
  previousClosingBalanceOfMutatedMonth = 0,
}: CascadeRecalculationParams): CascadeRecalculationResult {
  const updatedSummaries = new Map<string, FundMonthlySummary>();

  // 1. Recalculate mutated month
  const mutatedConfig =
    monthlyConfigs.get(`${fund.id}_${mutatedMonth}`) || monthlyConfigs.get(mutatedMonth);
  const mutatedSummary = calculateFundSummary({
    fund,
    yearMonth: mutatedMonth,
    monthlyConfig: mutatedConfig,
    transactions,
    previousClosingBalance: previousClosingBalanceOfMutatedMonth,
  });
  updatedSummaries.set(mutatedMonth, mutatedSummary);

  let runningClosingBalance = mutatedSummary.currentBalance;
  let stoppedAtMonth: string | undefined;

  // 2. Cascade through subsequent months
  for (const month of subsequentSortedMonths) {
    const config = monthlyConfigs.get(`${fund.id}_${month}`) || monthlyConfigs.get(month);
    const { mode } = getEffectiveMonthConfig(fund, config);

    if (mode === 'reset') {
      // Month uses reset: Opening balance is 0 ₫ regardless of previous closing balance.
      // Recalculate this reset month with opening balance = 0, then STOP cascade propagation.
      const resetSummary = calculateFundSummary({
        fund,
        yearMonth: month,
        monthlyConfig: config,
        transactions,
        previousClosingBalance: 0,
      });
      updatedSummaries.set(month, resetSummary);
      stoppedAtMonth = month;
      break;
    }

    // Month uses rollover: Inherits updated closing balance from previous month
    const rolloverSummary = calculateFundSummary({
      fund,
      yearMonth: month,
      monthlyConfig: config,
      transactions,
      previousClosingBalance: runningClosingBalance,
    });
    updatedSummaries.set(month, rolloverSummary);
    runningClosingBalance = rolloverSummary.currentBalance;
  }

  return {
    updatedSummaries,
    stoppedAtMonth,
  };
}

export interface ComputeFundSummaryWithHistoryParams {
  fund: Fund;
  targetYearMonth: string;
  monthlyConfigs: Map<string, FundMonthlyConfig>;
  transactions: Transaction[];
  initialOpeningBalance?: number;
}

/**
 * Computes the derived monthly summary for a fund in targetYearMonth by calculating
 * the historical chain of months leading up to targetYearMonth (PDR-010, PDR-013, PDR-017, PDR-022).
 *
 * Guarantees that:
 * - Rollover months inherit the exact closing balance of month M-1 (positive or negative).
 * - Reset months strictly start with opening balance = 0 ₫.
 * - Historical transaction edits cascade down through rollover months.
 * - Current month mutations are computed deterministically from source inputs.
 */
export function computeFundSummaryWithHistory({
  fund,
  targetYearMonth,
  monthlyConfigs,
  transactions,
  initialOpeningBalance = 0,
}: ComputeFundSummaryWithHistoryParams): FundMonthlySummary {
  // 1. Collect all distinct relevant months up to targetYearMonth for this fund
  const candidateMonths = new Set<string>();
  candidateMonths.add(targetYearMonth);

  // Check fund creation month
  if (fund.createdAt) {
    const createdMonth = fund.createdAt.substring(0, 7);
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(createdMonth) && createdMonth <= targetYearMonth) {
      candidateMonths.add(createdMonth);
    }
  }

  // Check monthly configs for this fund
  for (const [, cfg] of monthlyConfigs) {
    if (cfg.fundId === fund.id && cfg.yearMonth <= targetYearMonth) {
      candidateMonths.add(cfg.yearMonth);
    }
  }

  // Check transactions assigned to this fund
  for (const txn of transactions) {
    if (txn.fundId === fund.id) {
      const txnMonth = txn.transactionDate.substring(0, 7);
      if (txnMonth <= targetYearMonth) {
        candidateMonths.add(txnMonth);
      }
    }
  }

  const sortedCandidates = Array.from(candidateMonths).sort();
  const earliestMonth = sortedCandidates[0];

  // 2. Generate unbroken consecutive sequence of months from earliestMonth to targetYearMonth
  const sortedMonths = getYearMonthSequence(earliestMonth, targetYearMonth);

  // 3. Run historical chain
  const historicalSummaries = calculateHistoricalFundSummaries({
    fund,
    sortedMonths,
    monthlyConfigs,
    transactions,
    initialOpeningBalance,
  });

  const targetSummary = historicalSummaries.get(targetYearMonth);
  if (targetSummary) {
    return targetSummary;
  }

  // Fallback to standalone calculation if not found in history
  const config =
    monthlyConfigs.get(`${fund.id}_${targetYearMonth}`) ||
    monthlyConfigs.get(targetYearMonth);
  return calculateFundSummary({
    fund,
    yearMonth: targetYearMonth,
    monthlyConfig: config,
    transactions,
    previousClosingBalance: initialOpeningBalance,
  });
}
