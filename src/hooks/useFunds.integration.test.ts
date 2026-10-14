import { describe, it, expect } from 'vitest';
import type { Fund, FundMonthlyConfig, Transaction, PeriodFilter } from '../types';
import { computeFundSummaryWithHistory } from '../domain/fundCalculator';

/**
 * Domain Calculation Pipeline test suite underlying useFunds hook.
 * 
 * PHẠM VI XÁC THỰC:
 * Suite này kiểm thử trực tiếp hàm tính toán chuỗi lịch sử thuần túy (computeFundSummaryWithHistory)
 * cấu thành nên logic cốt lõi của useFunds (tính activeFundSummaries và archivedFundSummaries).
 * Lưu ý: Đây là kiểm thử pipeline tính toán với input đầu vào mô phỏng trạng thái repository,
 * không phải kiểm thử renderHook vòng đời React component (tránh bổ sung thư viện test không cần thiết).
 * 
 * Validates core scenarios mandated by PDR-010, PDR-013, PDR-017, PDR-019, and PDR-022.
 */
describe('useFunds Historical Balance & Propagation Integration', () => {
  const sampleFund: Fund = {
    id: 'fund_living_01',
    name: 'Quỹ Sinh Hoạt Gia Đình',
    icon: 'wallet',
    color: '#3B82F6',
    isArchived: false,
    order: 0,
    defaultBudget: 5000000,
    defaultMode: 'rollover',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };

  const createPeriod = (year: number, month: number): PeriodFilter => ({
    type: 'month',
    year,
    month,
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-31`,
  });

  // Helper simulating useFunds' real-time calculation pipeline
  const calculatePipeline = (
    fund: Fund,
    period: PeriodFilter,
    configs: FundMonthlyConfig[],
    transactions: Transaction[]
  ) => {
    const yearMonth = `${period.year}-${String(period.month).padStart(2, '0')}`;
    const configsMap = new Map<string, FundMonthlyConfig>();
    for (const cfg of configs) {
      configsMap.set(cfg.id, cfg);
      configsMap.set(`${cfg.fundId}_${cfg.yearMonth}`, cfg);
    }
    return computeFundSummaryWithHistory({
      fund,
      targetYearMonth: yearMonth,
      monthlyConfigs: configsMap,
      transactions,
    });
  };

  // 1. rollover kế thừa số dư dương
  it('Case 1: rollover mode correctly inherits positive closing balance from previous month', () => {
    const configs: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];

    const txns: Transaction[] = [
      {
        id: 'txn_jul_1',
        type: 'expense',
        amount: 3000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-15',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'txn_aug_1',
        type: 'expense',
        amount: 1500000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-08-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // July: 5,000,000 budget - 3,000,000 spent = 2,000,000 surplus
    // August: rollover inherits 2,000,000 opening + 5,000,000 budget - 1,500,000 spent = 5,500,000
    const augustSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configs, txns);

    expect(augustSummary.openingBalance).toBe(2000000);
    expect(augustSummary.monthlyBudget).toBe(5000000);
    expect(augustSummary.monthlySpending).toBe(1500000);
    expect(augustSummary.currentBalance).toBe(5500000);
    expect(augustSummary.isOverBudget).toBe(false);
  });

  // 2. rollover kế thừa số dư âm (thâm hụt / overbudget)
  it('Case 2: rollover mode correctly inherits negative closing balance (deficit) from previous month', () => {
    const configs: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 4000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];

    const txns: Transaction[] = [
      {
        id: 'txn_jul_over',
        type: 'expense',
        amount: 6000000, // Exceeds 4tr budget by 2tr
        categoryId: 'cat_electronics',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-20',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'txn_aug_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-08-05',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // July closing: 4,000,000 - 6,000,000 = -2,000,000
    // August: opening = -2,000,000. Current = -2,000,000 + 5,000,000 - 1,000,000 = 2,000,000
    const augustSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configs, txns);

    expect(augustSummary.openingBalance).toBe(-2000000);
    expect(augustSummary.currentBalance).toBe(2000000);
    expect(augustSummary.isOverBudget).toBe(false);
  });

  // 3. reset bắt đầu từ 0
  it('Case 3: reset mode strictly starts with 0 VND opening balance regardless of prior surplus or deficit', () => {
    const configs: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'reset', // Reset boundary
        updatedAt: '',
      },
    ];

    const txns: Transaction[] = [
      {
        id: 'txn_jul_1',
        type: 'expense',
        amount: 1000000, // July surplus +4,000,000
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // August has reset mode: opening balance must be strictly 0 VND
    const augustSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configs, txns);

    expect(augustSummary.openingBalance).toBe(0);
    expect(augustSummary.currentBalance).toBe(5000000); // 0 + 5tr - 0 = 5tr
  });

  // 4. Tháng rollover đứng sau tháng reset (PDR-022)
  it('Case 4: rollover month following a reset month inherits the closing balance of the reset month (PDR-022)', () => {
    const configs: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 3000000,
        budgetMode: 'reset',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 4000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];

    const txns: Transaction[] = [
      {
        id: 'txn_jul_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-12',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'txn_aug_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-08-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // July (reset): opening = 0, budget = 3tr, spent = 1tr -> closing = +2tr
    // August (rollover): per PDR-022, receives July's closing balance (+2tr)!
    // August: opening = +2tr, budget = 4tr, spent = 1tr -> current = +5tr
    const augustSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configs, txns);

    expect(augustSummary.openingBalance).toBe(2000000);
    expect(augustSummary.currentBalance).toBe(5000000);
  });

  // 5. Sửa giao dịch ở tháng cũ và tính lại các tháng sau (PDR-019 Cascade)
  it('Case 5: editing historical transaction in an older month recalculates all subsequent rollover months', () => {
    const configs: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-09',
        fundId: 'fund_living_01',
        yearMonth: '2026-09',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];

    // July original spent was 2tr. Now user edited it to 4tr (+2tr increase in spending)
    const txnsWithHistoricalEdit: Transaction[] = [
      {
        id: 'txn_jul_edited',
        type: 'expense',
        amount: 4000000, // Edited from 2,000,000 to 4,000,000
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-10',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'txn_aug_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-08-10',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'txn_sep_1',
        type: 'expense',
        amount: 2000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // July closing: 5tr - 4tr = 1tr
    // August opening: 1tr, closing = 1tr + 5tr - 1tr = 5tr
    // September opening: 5tr, current = 5tr + 5tr - 2tr = 8tr
    const sepSummary = calculatePipeline(sampleFund, createPeriod(2026, 9), configs, txnsWithHistoricalEdit);

    expect(sepSummary.openingBalance).toBe(5000000);
    expect(sepSummary.currentBalance).toBe(8000000);
  });

  // 6. Thay đổi ngân sách hoặc chế độ trong tháng hiện tại (PDR-012, PDR-014, PDR-017)
  it('Case 6: changing budget or mode in current month calculates deterministically from raw source inputs', () => {
    const txns: Transaction[] = [
      {
        id: 'txn_jul_1',
        type: 'expense',
        amount: 2000000, // July closing = 5tr - 2tr = 3tr
        categoryId: 'cat_groceries',
        fundId: 'fund_living_01',
        transactionDate: '2026-07-15',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Initial August: rollover, budget 5tr -> current = 3tr + 5tr = 8tr
    const configInitial: FundMonthlyConfig[] = [
      {
        id: 'fund_living_01_2026-07',
        fundId: 'fund_living_01',
        yearMonth: '2026-07',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];
    const initialSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configInitial, txns);
    expect(initialSummary.openingBalance).toBe(3000000);
    expect(initialSummary.currentBalance).toBe(8000000);

    // User changes mode to reset in August:
    const configWithReset: FundMonthlyConfig[] = [
      configInitial[0],
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 5000000,
        budgetMode: 'reset',
        updatedAt: '',
      },
    ];
    const resetSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configWithReset, txns);
    expect(resetSummary.openingBalance).toBe(0);
    expect(resetSummary.currentBalance).toBe(5000000);

    // User changes budget to 7tr and mode back to rollover in August:
    const configWithUpdatedBudget: FundMonthlyConfig[] = [
      configInitial[0],
      {
        id: 'fund_living_01_2026-08',
        fundId: 'fund_living_01',
        yearMonth: '2026-08',
        monthlyBudget: 7000000,
        budgetMode: 'rollover',
        updatedAt: '',
      },
    ];
    const finalSummary = calculatePipeline(sampleFund, createPeriod(2026, 8), configWithUpdatedBudget, txns);
    expect(finalSummary.openingBalance).toBe(3000000);
    expect(finalSummary.monthlyBudget).toBe(7000000);
    expect(finalSummary.currentBalance).toBe(10000000); // 3tr + 7tr = 10tr
  });

  // 7. Không có dữ liệu lịch sử hoặc thiếu cấu hình tháng
  it('Case 7: smoothly falls back to fund defaultBudget and defaultMode when monthly configs are absent', () => {
    // 7A: Brand new fund with no historical data prior to current month
    const brandNewFund: Fund = {
      ...sampleFund,
      id: 'fund_brand_new',
      createdAt: '2026-10-01T00:00:00.000Z',
    };
    const emptyConfigs: FundMonthlyConfig[] = [];
    const txns: Transaction[] = [];

    const summaryNew = calculatePipeline(brandNewFund, createPeriod(2026, 10), emptyConfigs, txns);
    expect(summaryNew.openingBalance).toBe(0);
    expect(summaryNew.monthlyBudget).toBe(5000000);
    expect(summaryNew.budgetMode).toBe('rollover');
    expect(summaryNew.monthlySpending).toBe(0);
    expect(summaryNew.currentBalance).toBe(5000000);
    expect(summaryNew.isOverBudget).toBe(false);

    // 7B: Fund with historical transactions in previous month, but missing explicit monthly configs in store
    const fundWithHistory: Fund = {
      ...sampleFund,
      id: 'fund_no_config',
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    const txnsHistory: Transaction[] = [
      {
        id: 'txn_sep_1',
        type: 'expense',
        amount: 2000000, // September spending
        categoryId: 'cat_groceries',
        fundId: 'fund_no_config',
        transactionDate: '2026-09-15',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // September (no config): falls back to defaultBudget = 5tr, spent = 2tr -> closing = +3tr
    // October (no config): falls back to defaultBudget = 5tr, defaultMode = rollover -> opening = +3tr, current = +8tr
    const summaryWithHistory = calculatePipeline(fundWithHistory, createPeriod(2026, 10), emptyConfigs, txnsHistory);
    expect(summaryWithHistory.openingBalance).toBe(3000000);
    expect(summaryWithHistory.monthlyBudget).toBe(5000000);
    expect(summaryWithHistory.budgetMode).toBe('rollover');
    expect(summaryWithHistory.currentBalance).toBe(8000000);
  });

  // 8. Nhiều lần thay đổi cấu hình trong cùng tháng không gây tính lũy kế trùng (PDR-017)
  it('Case 8: multiple config updates in the same month produce idempotent results without duplicate accumulation', () => {
    const fundCreatedInAug: Fund = {
      ...sampleFund,
      id: 'fund_aug_created',
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    const txns: Transaction[] = [
      {
        id: 'txn_aug_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_aug_created',
        transactionDate: '2026-08-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Simulate 3 successive updates in August: budget 6tr -> 7tr -> 8tr
    const configsV1: FundMonthlyConfig[] = [
      {
        id: 'fund_aug_created_2026-08',
        fundId: 'fund_aug_created',
        yearMonth: '2026-08',
        monthlyBudget: 6000000,
        budgetMode: 'rollover',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    const configsV2: FundMonthlyConfig[] = [
      {
        id: 'fund_aug_created_2026-08',
        fundId: 'fund_aug_created',
        yearMonth: '2026-08',
        monthlyBudget: 7000000,
        budgetMode: 'rollover',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    const configsFinal: FundMonthlyConfig[] = [
      {
        id: 'fund_aug_created_2026-08',
        fundId: 'fund_aug_created',
        yearMonth: '2026-08',
        monthlyBudget: 8000000,
        budgetMode: 'rollover',
        updatedAt: '2026-08-03T00:00:00.000Z',
      },
    ];

    const run1 = calculatePipeline(fundCreatedInAug, createPeriod(2026, 8), configsV1, txns);
    const run2 = calculatePipeline(fundCreatedInAug, createPeriod(2026, 8), configsV2, txns);
    const runFinal = calculatePipeline(fundCreatedInAug, createPeriod(2026, 8), configsFinal, txns);

    expect(run1.currentBalance).toBe(5000000); // 0 + 6tr - 1tr = 5tr
    expect(run2.currentBalance).toBe(6000000); // 0 + 7tr - 1tr = 6tr
    expect(runFinal.currentBalance).toBe(7000000); // 0 + 8tr - 1tr = 7tr (NOT 5tr + 6tr + 7tr!)

    // Re-calculating with configsFinal gives identical result (idempotency)
    const runFinalRepeat = calculatePipeline(fundCreatedInAug, createPeriod(2026, 8), configsFinal, txns);
    expect(runFinalRepeat).toEqual(runFinal);
  });

  // 9. Quỹ tạo tháng 07/2026, không phát sinh giao dịch/cấu hình tháng 07, 08, 09; bắt đầu phát sinh tháng 10/2026
  it('Case 9: fund created in 2026-07 with no transactions until 2026-10 accumulates dormant rollover budgets', () => {
    const fundCreatedJul: Fund = {
      id: 'fund_dormant_01',
      name: 'Quỹ Sinh Hoạt Tạo Tháng 07',
      icon: 'wallet',
      color: '#3B82F6',
      isArchived: false,
      order: 0,
      defaultBudget: 5000000,
      defaultMode: 'rollover',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    };

    const emptyConfigs: FundMonthlyConfig[] = [];
    const txns: Transaction[] = [
      {
        id: 'txn_oct_1',
        type: 'expense',
        amount: 1000000,
        categoryId: 'cat_groceries',
        fundId: 'fund_dormant_01',
        transactionDate: '2026-10-12',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Pipeline executes candidateMonths: ['2026-07', '2026-10'] -> sequence ['2026-07', '2026-08', '2026-09', '2026-10']
    // Tháng 07: opening = 0, closing = 5tr
    // Tháng 08: opening = 5tr, closing = 10tr
    // Tháng 09: opening = 10tr, closing = 15tr
    // Tháng 10: opening = 15tr, budget = 5tr, spent = 1tr -> current = 19tr
    const octSummary = calculatePipeline(fundCreatedJul, createPeriod(2026, 10), emptyConfigs, txns);
    expect(octSummary.openingBalance).toBe(15000000);
    expect(octSummary.monthlyBudget).toBe(5000000);
    expect(octSummary.monthlySpending).toBe(1000000);
    expect(octSummary.currentBalance).toBe(19000000);
    expect(octSummary.isOverBudget).toBe(false);
  });
});

