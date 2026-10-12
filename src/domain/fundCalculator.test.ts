import { describe, it, expect } from 'vitest';
import type { Fund, FundMonthlyConfig, Transaction } from '../types';
import {
  calculateTargetMonthOpeningBalance,
  getEffectiveMonthConfig,
  calculateFundSpending,
  calculateFundSummary,
  calculateHistoricalFundSummaries,
  calculateCascadeRecalculation,
  computeFundSummaryWithHistory,
} from './fundCalculator';

describe('fundCalculator pure domain engine', () => {
  const baseFund: Fund = {
    id: 'fund_living',
    name: 'Quỹ Sinh Hoạt',
    icon: 'Wallet',
    color: '#3B82F6',
    isArchived: false,
    order: 0,
    defaultBudget: 5000000,
    defaultMode: 'rollover',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  describe('calculateTargetMonthOpeningBalance (PDR-022 Target-Month Rule)', () => {
    it('returns exact previous closing balance when target mode is rollover', () => {
      expect(calculateTargetMonthOpeningBalance(1500000, 'rollover')).toBe(1500000);
      expect(calculateTargetMonthOpeningBalance(-450000, 'rollover')).toBe(-450000);
      expect(calculateTargetMonthOpeningBalance(0, 'rollover')).toBe(0);
    });

    it('returns strictly 0 VND when target mode is reset regardless of previous closing balance', () => {
      expect(calculateTargetMonthOpeningBalance(1500000, 'reset')).toBe(0);
      expect(calculateTargetMonthOpeningBalance(-450000, 'reset')).toBe(0);
      expect(calculateTargetMonthOpeningBalance(0, 'reset')).toBe(0);
    });
  });

  describe('getEffectiveMonthConfig', () => {
    it('uses monthly config when provided', () => {
      const config: FundMonthlyConfig = {
        id: 'fund_living_2026-10',
        fundId: 'fund_living',
        yearMonth: '2026-10',
        monthlyBudget: 7000000,
        budgetMode: 'reset',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const result = getEffectiveMonthConfig(baseFund, config);
      expect(result.budget).toBe(7000000);
      expect(result.mode).toBe('reset');
    });

    it('falls back to fund defaults when config is absent', () => {
      const result = getEffectiveMonthConfig(baseFund, null);
      expect(result.budget).toBe(5000000);
      expect(result.mode).toBe('rollover');
    });
  });

  describe('calculateFundSpending', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 50000,
        categoryId: 'c1',
        fundId: 'fund_living',
        transactionDate: '2026-10-05',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 't2',
        type: 'expense',
        amount: 150000,
        categoryId: 'c1',
        fundId: 'fund_living',
        transactionDate: '2026-10-12',
        createdAt: '',
        updatedAt: '',
      },
      // Different month (September)
      {
        id: 't3',
        type: 'expense',
        amount: 200000,
        categoryId: 'c1',
        fundId: 'fund_living',
        transactionDate: '2026-09-20',
        createdAt: '',
        updatedAt: '',
      },
      // Different fund
      {
        id: 't4',
        type: 'expense',
        amount: 300000,
        categoryId: 'c1',
        fundId: 'fund_entertainment',
        transactionDate: '2026-10-15',
        createdAt: '',
        updatedAt: '',
      },
      // Income tagged to fund (should count in count, but not add to spending)
      {
        id: 't5',
        type: 'income',
        amount: 1000000,
        categoryId: 'c2',
        fundId: 'fund_living',
        transactionDate: '2026-10-01',
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('sums only expenses for the specific fund and month', () => {
      const result = calculateFundSpending(transactions, 'fund_living', '2026-10');
      expect(result.totalSpending).toBe(200000); // 50k + 150k
      expect(result.count).toBe(3); // t1, t2, t5
    });
  });

  describe('calculateFundSummary', () => {
    it('calculates rollover fund with positive opening balance and normal spending', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-10-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summary = calculateFundSummary({
        fund: baseFund,
        yearMonth: '2026-10',
        transactions,
        previousClosingBalance: 1000000,
      });

      expect(summary.openingBalance).toBe(1000000);
      expect(summary.monthlyBudget).toBe(5000000);
      expect(summary.monthlySpending).toBe(2000000);
      // currentBalance = 1,000,000 + 5,000,000 - 2,000,000 = 4,000,000
      expect(summary.currentBalance).toBe(4000000);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.spendingPercentage).toBe(40); // 2tr / 5tr = 40%
    });

    it('calculates over-budget state with negative balance and badge (PDR-011)', () => {
      const transactions: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 6000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-10-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summary = calculateFundSummary({
        fund: baseFund,
        yearMonth: '2026-10',
        transactions,
        previousClosingBalance: 0,
      });

      expect(summary.currentBalance).toBe(-1000000); // 0 + 5tr - 6tr
      expect(summary.isOverBudget).toBe(true);
      expect(summary.spendingPercentage).toBe(120); // 6tr / 5tr = 120%
    });

    it('handles budget = 0 VND without dividing by zero (PDR-011)', () => {
      const zeroBudgetFund: Fund = { ...baseFund, defaultBudget: 0 };
      const summary = calculateFundSummary({
        fund: zeroBudgetFund,
        yearMonth: '2026-10',
        transactions: [],
        previousClosingBalance: 0,
      });

      expect(summary.monthlyBudget).toBe(0);
      expect(summary.currentBalance).toBe(0);
      expect(summary.spendingPercentage).toBe(0);
      expect(summary.isOverBudget).toBe(false);
    });
  });

  describe('calculateHistoricalFundSummaries (PDR-022 Multi-Month Chain)', () => {
    it('correctly handles reset -> rollover: month M+1 STILL receives Closing Balance of month M!', () => {
      // Month 1: 2026-08 (reset mode, budget 3tr, spending 1tr -> closing = +2tr)
      // Month 2: 2026-09 (rollover mode, budget 4tr, spending 2tr)
      // Per PDR-022: month 2 receives month 1's closing balance (+2tr)!
      // Month 2 opening = +2tr, current = +2tr + 4tr - 2tr = +4tr.
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 3000000,
        budgetMode: 'reset',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 4000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't_aug',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-15',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_sep',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const history = calculateHistoricalFundSummaries({
        fund: baseFund,
        sortedMonths: ['2026-08', '2026-09'],
        monthlyConfigs: configs,
        transactions: txns,
        initialOpeningBalance: 0,
      });

      const augSummary = history.get('2026-08')!;
      expect(augSummary.openingBalance).toBe(0);
      expect(augSummary.currentBalance).toBe(2000000); // 0 + 3tr - 1tr = 2tr

      const sepSummary = history.get('2026-09')!;
      expect(sepSummary.openingBalance).toBe(2000000); // Target-month is rollover, receives 2tr!
      expect(sepSummary.currentBalance).toBe(4000000); // 2tr + 4tr - 2tr = 4tr
    });

    it('correctly handles rollover -> reset: month M+1 resets opening balance to 0 VND', () => {
      // Month 1: 2026-08 (rollover, budget 5tr, spending 1tr -> closing = +4tr)
      // Month 2: 2026-09 (reset, budget 5tr, spending 2tr)
      // Month 2 opening = 0, current = 0 + 5tr - 2tr = 3tr
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'reset',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't_aug',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-15',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_sep',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const history = calculateHistoricalFundSummaries({
        fund: baseFund,
        sortedMonths: ['2026-08', '2026-09'],
        monthlyConfigs: configs,
        transactions: txns,
        initialOpeningBalance: 0,
      });

      const sepSummary = history.get('2026-09')!;
      expect(sepSummary.openingBalance).toBe(0); // Reset boundary
      expect(sepSummary.currentBalance).toBe(3000000); // 0 + 5tr - 2tr = 3tr
    });
  });

  describe('calculateCascadeRecalculation (PDR-019 Cascade Recalculation)', () => {
    it('propagates balance change through rollover months and stops at reset month', () => {
      // Setup: 3 consecutive months:
      // Month 1 (Mutated): 2026-07 (rollover, budget 5tr, spending was updated to 4tr -> closing = +1tr)
      // Month 2: 2026-08 (rollover, budget 5tr, spending 2tr) -> receives +1tr -> closing = 1tr + 5tr - 2tr = 4tr
      // Month 3: 2026-09 (reset, budget 5tr, spending 1tr) -> receives 0tr -> closing = 0 + 5tr - 1tr = 4tr
      // Month 4: 2026-10 (rollover) -> NOT touched by cascade because cascade stops at Month 3!
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-07', {
        id: 'fund_living_2026-07',
        fundId: 'fund_living',
        yearMonth: '2026-07',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'reset',
        updatedAt: '',
      });
      configs.set('fund_living_2026-10', {
        id: 'fund_living_2026-10',
        fundId: 'fund_living',
        yearMonth: '2026-10',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't_jul',
          type: 'expense',
          amount: 4000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-07-20',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_aug',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-20',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_sep',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-20',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = calculateCascadeRecalculation({
        fund: baseFund,
        mutatedMonth: '2026-07',
        subsequentSortedMonths: ['2026-08', '2026-09', '2026-10'],
        monthlyConfigs: configs,
        transactions: txns,
        previousClosingBalanceOfMutatedMonth: 0,
      });

      // Mutated month recalculated
      expect(result.updatedSummaries.get('2026-07')?.currentBalance).toBe(1000000);

      // Month 2 (rollover) inherits 1tr
      expect(result.updatedSummaries.get('2026-08')?.openingBalance).toBe(1000000);
      expect(result.updatedSummaries.get('2026-08')?.currentBalance).toBe(4000000);

      // Month 3 (reset) receives 0 VND and stops the cascade
      expect(result.updatedSummaries.get('2026-09')?.openingBalance).toBe(0);
      expect(result.stoppedAtMonth).toBe('2026-09');

      // Month 4 should NOT have been recalculated in this cascade run
      expect(result.updatedSummaries.has('2026-10')).toBe(false);
    });
  });

  describe('computeFundSummaryWithHistory (End-to-end historical chain & PDR-010/017/019/022)', () => {
    it('1. rollover inherits positive closing balance from prior month', () => {
      // 2026-08: budget 5tr, spent 3tr -> closing = +2tr
      // 2026-09: rollover, budget 5tr, spent 1tr -> opening should be +2tr, current = +6tr
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 3000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't2',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summarySep = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: configs,
        transactions: txns,
      });

      expect(summarySep.openingBalance).toBe(2000000); // 5tr - 3tr = +2tr
      expect(summarySep.monthlyBudget).toBe(5000000);
      expect(summarySep.monthlySpending).toBe(1000000);
      expect(summarySep.currentBalance).toBe(6000000); // 2tr + 5tr - 1tr = 6tr
      expect(summarySep.isOverBudget).toBe(false);
    });

    it('2. rollover inherits negative balance (overdraft) from prior month', () => {
      // 2026-08: budget 3tr, spent 4.5tr -> closing = -1.5tr
      // 2026-09: rollover, budget 3tr, spent 1tr -> opening should be -1.5tr, current = +500k
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 3000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 3000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 4500000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't2',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-05',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summarySep = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: configs,
        transactions: txns,
      });

      expect(summarySep.openingBalance).toBe(-1500000); // Negative carried forward
      expect(summarySep.currentBalance).toBe(500000); // -1.5tr + 3tr - 1tr = +500k
      expect(summarySep.isOverBudget).toBe(false);
    });

    it('3. reset strictly starts with 0 VND opening balance regardless of prior surplus or deficit', () => {
      // 2026-08: closing = +3tr
      // 2026-09: mode = reset -> opening balance must be 0 VND!
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'reset',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summarySep = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: configs,
        transactions: txns,
      });

      expect(summarySep.openingBalance).toBe(0); // Reset boundary
      expect(summarySep.currentBalance).toBe(5000000); // 0 + 5tr - 0 = 5tr
    });

    it('4. rollover following a reset month inherits the closing balance of the reset month (PDR-022)', () => {
      // 2026-07: reset, budget 2tr, spent 500k -> closing = 1.5tr
      // 2026-08: rollover, budget 3tr, spent 1tr -> opening should be 1.5tr, closing = 3.5tr
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-07', {
        id: 'fund_living_2026-07',
        fundId: 'fund_living',
        yearMonth: '2026-07',
        monthlyBudget: 2000000,
        budgetMode: 'reset',
        updatedAt: '',
      });
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 3000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't_jul',
          type: 'expense',
          amount: 500000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-07-15',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_aug',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-15',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summaryAug = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-08',
        monthlyConfigs: configs,
        transactions: txns,
      });

      expect(summaryAug.openingBalance).toBe(1500000); // 2tr - 500k = 1.5tr
      expect(summaryAug.currentBalance).toBe(3500000); // 1.5tr + 3tr - 1tr = 3.5tr
    });

    it('5. editing historical transaction cascades down through subsequent rollover months (PDR-019)', () => {
      // Initial state:
      // 2026-08: budget 5tr, original spent 2tr -> closing = 3tr
      // 2026-09: rollover, budget 5tr, spent 1tr -> opening = 3tr, closing = 7tr
      // 2026-10: rollover, budget 5tr, spent 2tr -> opening = 7tr, closing = 10tr
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configs.set('fund_living_2026-10', {
        id: 'fund_living_2026-10',
        fundId: 'fund_living',
        yearMonth: '2026-10',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      // Now simulate user edited 2026-08 transaction: spent changed from 2tr to 4tr (+2tr expense)
      const txnsAfterEdit: Transaction[] = [
        {
          id: 't_aug',
          type: 'expense',
          amount: 4000000, // Edited from 2tr to 4tr
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_sep',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-10',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't_oct',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-10-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      // View 2026-10:
      // 2026-08 closing = 5tr - 4tr = 1tr
      // 2026-09 opening = 1tr, closing = 1tr + 5tr - 1tr = 5tr
      // 2026-10 opening = 5tr, current = 5tr + 5tr - 2tr = 8tr
      const summaryOct = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-10',
        monthlyConfigs: configs,
        transactions: txnsAfterEdit,
      });

      expect(summaryOct.openingBalance).toBe(5000000); // Updated cascade value
      expect(summaryOct.currentBalance).toBe(8000000); // 5tr + 5tr - 2tr = 8tr
    });

    it('6. changing budget or mode in current month calculates deterministically from source inputs (PDR-017 Model A)', () => {
      // 2026-08: closing = 2tr
      // 2026-09: initially rollover, budget 3tr -> current = 2tr + 3tr = 5tr
      // User changes mode in 2026-09 to reset:
      const configsReset = new Map<string, FundMonthlyConfig>();
      configsReset.set('fund_living_2026-08', {
        id: 'fund_living_2026-08',
        fundId: 'fund_living',
        yearMonth: '2026-08',
        monthlyBudget: 3000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });
      configsReset.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 3000000,
        budgetMode: 'reset', // Changed to reset
        updatedAt: '',
      });

      const txns: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 1000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summaryReset = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: configsReset,
        transactions: txns,
      });

      expect(summaryReset.openingBalance).toBe(0);
      expect(summaryReset.currentBalance).toBe(3000000);

      // Now user changes back to rollover:
      const configsRollover = new Map(configsReset);
      configsRollover.set('fund_living_2026-09', {
        id: 'fund_living_2026-09',
        fundId: 'fund_living',
        yearMonth: '2026-09',
        monthlyBudget: 4000000, // Also changed budget to 4tr
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const summaryRollover = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: configsRollover,
        transactions: txns,
      });

      // Opening balance cleanly returns to 2026-08 closing (2tr), zero accumulated noise!
      expect(summaryRollover.openingBalance).toBe(2000000);
      expect(summaryRollover.currentBalance).toBe(6000000); // 2tr + 4tr - 0 = 6tr
    });

    it('7. missing month config falls back smoothly to defaultBudget and defaultMode', () => {
      // No explicit configs for fund_living in map:
      const emptyConfigs = new Map<string, FundMonthlyConfig>();

      // baseFund has defaultBudget: 5,000,000 and defaultMode: rollover
      const txns: Transaction[] = [
        {
          id: 't1',
          type: 'expense',
          amount: 1500000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-08-10',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 't2',
          type: 'expense',
          amount: 2000000,
          categoryId: 'c1',
          fundId: 'fund_living',
          transactionDate: '2026-09-10',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summarySep = computeFundSummaryWithHistory({
        fund: baseFund,
        targetYearMonth: '2026-09',
        monthlyConfigs: emptyConfigs,
        transactions: txns,
      });

      // 2026-08: default 5tr - 1.5tr = 3.5tr closing
      // 2026-09: default rollover inherits 3.5tr. Current = 3.5tr + 5tr - 2tr = 6.5tr
      expect(summarySep.openingBalance).toBe(3500000);
      expect(summarySep.monthlyBudget).toBe(5000000);
      expect(summarySep.currentBalance).toBe(6500000);
    });

    it('8. multiple config mutations in the same month produce consistent, non-accumulated result', () => {
      // Simulate calling computeFundSummaryWithHistory repeatedly with different configs
      const configs = new Map<string, FundMonthlyConfig>();
      configs.set('fund_living_2026-10', {
        id: 'fund_living_2026-10',
        fundId: 'fund_living',
        yearMonth: '2026-10',
        monthlyBudget: 10000000,
        budgetMode: 'rollover',
        updatedAt: '',
      });

      const fundOct: Fund = {
        ...baseFund,
        createdAt: '2026-10-01T00:00:00.000Z',
      };

      const res1 = computeFundSummaryWithHistory({
        fund: fundOct,
        targetYearMonth: '2026-10',
        monthlyConfigs: configs,
        transactions: [],
      });

      const res2 = computeFundSummaryWithHistory({
        fund: fundOct,
        targetYearMonth: '2026-10',
        monthlyConfigs: configs,
        transactions: [],
      });

      expect(res1).toEqual(res2);
      expect(res1.currentBalance).toBe(10000000);
    });

    it('9. no prior history returns initial opening balance (0 VND)', () => {
      const fundBrandNew: Fund = {
        ...baseFund,
        id: 'fund_new',
        createdAt: '2026-10-01T00:00:00.000Z',
      };

      const summary = computeFundSummaryWithHistory({
        fund: fundBrandNew,
        targetYearMonth: '2026-10',
        monthlyConfigs: new Map(),
        transactions: [],
      });

      expect(summary.openingBalance).toBe(0);
      expect(summary.currentBalance).toBe(5000000); // 0 + 5tr - 0
    });
  });
});
