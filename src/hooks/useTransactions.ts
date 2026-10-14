import { useState, useEffect, useCallback } from 'react';
import type { Transaction, PeriodFilter } from '../types';
import { transactionRepository } from '../services';

export function useTransactions(period: PeriodFilter) {
  const [periodTransactions, setPeriodTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (): Promise<Transaction[]> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch transactions within the current period
      const currentPeriodList = await transactionRepository.getByPeriod(
        period.startDate,
        period.endDate
      );
      setPeriodTransactions(currentPeriodList);

      // 2. Fetch all transactions (for full ledger history)
      const fullList = await transactionRepository.getAll();
      setAllTransactions(fullList);
      return fullList;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu giao dịch');
      return [];
    } finally {
      setLoading(false);
    }
  }, [period.startDate, period.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newTxn: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      await transactionRepository.create(newTxn);
      await loadData();
    },
    [loadData]
  );

  const updateTransaction = useCallback(
    async (transaction: Transaction) => {
      const updatedTxn: Transaction = {
        ...transaction,
        updatedAt: new Date().toISOString(),
      };

      await transactionRepository.update(updatedTxn);
      await loadData();
    },
    [loadData]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await transactionRepository.delete(id);
      await loadData();
    },
    [loadData]
  );

  return {
    periodTransactions,
    allTransactions,
    loading,
    error,
    reload: loadData,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
