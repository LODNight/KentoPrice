import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Fund, FundMonthlyConfig, FundMonthlySummary, PeriodFilter, BudgetMode, Transaction } from '../types';
import { fundRepository } from '../services';
import { computeFundSummaryWithHistory } from '../domain/fundCalculator';

export function useFunds(period: PeriodFilter, transactions: Transaction[]) {
  const [allFunds, setAllFunds] = useState<Fund[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<FundMonthlyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearMonth = useMemo(() => {
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
  }, [period.year, period.month]);

  // Load funds and all monthly configs for accurate historical cascade calculation
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundsList, configsList] = await Promise.all([
        fundRepository.getAll(true), // get both active & archived
        fundRepository.getAllMonthlyConfigs(),
      ]);
      setAllFunds(fundsList);
      setMonthlyConfigs(configsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu Quỹ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active funds (ordered)
  const activeFunds = useMemo(() => {
    return allFunds.filter((f) => !f.isArchived);
  }, [allFunds]);

  // Archived funds
  const archivedFunds = useMemo(() => {
    return allFunds.filter((f) => f.isArchived);
  }, [allFunds]);

  // Configs mapped by composite id `${fundId}_${yearMonth}` for quick lookup
  const configsMap = useMemo(() => {
    const map = new Map<string, FundMonthlyConfig>();
    for (const cfg of monthlyConfigs) {
      map.set(cfg.id, cfg);
      map.set(`${cfg.fundId}_${cfg.yearMonth}`, cfg);
    }
    return map;
  }, [monthlyConfigs]);

  // Real-time derived summaries for active funds with full historical chain
  const activeFundSummaries = useMemo<FundMonthlySummary[]>(() => {
    return activeFunds.map((fund) => {
      return computeFundSummaryWithHistory({
        fund,
        targetYearMonth: yearMonth,
        monthlyConfigs: configsMap,
        transactions,
      });
    });
  }, [activeFunds, configsMap, yearMonth, transactions]);

  // Real-time derived summaries for archived funds with full historical chain
  const archivedFundSummaries = useMemo<FundMonthlySummary[]>(() => {
    return archivedFunds.map((fund) => {
      return computeFundSummaryWithHistory({
        fund,
        targetYearMonth: yearMonth,
        monthlyConfigs: configsMap,
        transactions,
      });
    });
  }, [archivedFunds, configsMap, yearMonth, transactions]);

  // Overall budget overview for the current month
  const budgetOverview = useMemo(() => {
    let totalBudget = 0;
    let totalSpending = 0;
    let totalRemaining = 0;

    for (const summary of activeFundSummaries) {
      totalBudget += summary.monthlyBudget;
      totalSpending += summary.monthlySpending;
      totalRemaining += summary.currentBalance;
    }

    return {
      totalBudget,
      totalSpending,
      totalRemaining,
      activeCount: activeFunds.length,
      isCapacityFull: activeFunds.length >= 10,
    };
  }, [activeFundSummaries, activeFunds.length]);

  // Action: Create new Fund
  const createFund = useCallback(
    async (data: {
      name: string;
      icon: string;
      color: string;
      defaultBudget: number;
      defaultMode: BudgetMode;
    }) => {
      const now = new Date().toISOString();
      const newFund: Fund = {
        id: `fund_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: data.name.trim(),
        icon: data.icon,
        color: data.color,
        isArchived: false,
        order: activeFunds.length,
        defaultBudget: data.defaultBudget,
        defaultMode: data.defaultMode,
        createdAt: now,
        updatedAt: now,
      };

      await fundRepository.create(newFund);

      // Also create current month config if entering a custom budget or mode
      const monthConfig: FundMonthlyConfig = {
        id: `${newFund.id}_${yearMonth}`,
        fundId: newFund.id,
        yearMonth,
        monthlyBudget: data.defaultBudget,
        budgetMode: data.defaultMode,
        updatedAt: now,
      };
      await fundRepository.setMonthlyConfig(monthConfig);

      await loadData();
      return newFund;
    },
    [activeFunds.length, yearMonth, loadData]
  );

  // Action: Update basic Fund details (name, icon, color, order)
  const updateFund = useCallback(
    async (fund: Fund) => {
      const updated: Fund = {
        ...fund,
        name: fund.name.trim(),
        updatedAt: new Date().toISOString(),
      };
      await fundRepository.update(updated);
      await loadData();
    },
    [loadData]
  );

  // Action: Update budget / mode for the CURRENT month (PDR-012, PDR-013, PDR-014)
  const updateMonthConfig = useCallback(
    async (fundId: string, monthlyBudget: number, budgetMode: BudgetMode) => {
      const config: FundMonthlyConfig = {
        id: `${fundId}_${yearMonth}`,
        fundId,
        yearMonth,
        monthlyBudget,
        budgetMode,
        updatedAt: new Date().toISOString(),
      };
      await fundRepository.setMonthlyConfig(config);
      await loadData();
    },
    [yearMonth, loadData]
  );

  // Action: Archive Fund
  const archiveFund = useCallback(
    async (id: string) => {
      await fundRepository.archive(id);
      await loadData();
    },
    [loadData]
  );

  // Action: Restore Fund
  const restoreFund = useCallback(
    async (id: string) => {
      await fundRepository.restore(id);
      await loadData();
    },
    [loadData]
  );

  return {
    allFunds,
    activeFunds,
    archivedFunds,
    activeFundSummaries,
    archivedFundSummaries,
    budgetOverview,
    loading,
    error,
    createFund,
    updateFund,
    updateMonthConfig,
    archiveFund,
    restoreFund,
    reloadFunds: loadData,
  };
}
