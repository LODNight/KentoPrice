import { describe, it, expect } from 'vitest';
import { calculateSummary } from './calculator';
import type { Transaction, Category, PeriodFilter } from '../types';

describe('calculator utilities', () => {
  const sampleCategories: Category[] = [
    {
      id: 'cat_food',
      name: 'Ăn uống',
      type: 'expense',
      icon: 'Utensils',
      color: '#F59E0B',
      isDefault: true,
      isArchived: false,
      order: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'cat_coffee',
      name: 'Cà phê',
      type: 'expense',
      icon: 'Coffee',
      color: '#84CC16',
      isDefault: true,
      isArchived: false,
      order: 2,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'cat_salary',
      name: 'Tiền lương',
      type: 'income',
      icon: 'Banknote',
      color: '#10B981',
      isDefault: true,
      isArchived: false,
      order: 3,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const samplePeriod: PeriodFilter = {
    type: 'month',
    year: 2026,
    month: 9,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  };

  it('correctly calculates totalIncome, totalExpense, and netBalance', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'income',
        amount: 20000000,
        categoryId: 'cat_salary',
        transactionDate: '2026-09-05',
        createdAt: '2026-09-05T00:00:00.000Z',
        updatedAt: '2026-09-05T00:00:00.000Z',
      },
      {
        id: 't2',
        type: 'expense',
        amount: 60000,
        categoryId: 'cat_food',
        transactionDate: '2026-09-10',
        createdAt: '2026-09-10T00:00:00.000Z',
        updatedAt: '2026-09-10T00:00:00.000Z',
      },
      {
        id: 't3',
        type: 'expense',
        amount: 40000,
        categoryId: 'cat_coffee',
        transactionDate: '2026-09-12',
        createdAt: '2026-09-12T00:00:00.000Z',
        updatedAt: '2026-09-12T00:00:00.000Z',
      },
    ];

    const summary = calculateSummary(transactions, sampleCategories, samplePeriod);

    expect(summary.totalIncome).toBe(20000000);
    expect(summary.totalExpense).toBe(100000);
    expect(summary.netBalance).toBe(19900000);
    expect(summary.transactionCount).toBe(3);

    // Expense breakdown: 60k is 60%, 40k is 40%
    expect(summary.expenseBreakdown.length).toBe(2);
    expect(summary.expenseBreakdown[0].categoryId).toBe('cat_food');
    expect(summary.expenseBreakdown[0].percentage).toBe(60);
    expect(summary.expenseBreakdown[1].categoryId).toBe('cat_coffee');
    expect(summary.expenseBreakdown[1].percentage).toBe(40);
  });

  it('filters out transactions outside the target period', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 50000,
        categoryId: 'cat_food',
        transactionDate: '2026-08-31', // August (outside)
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
      {
        id: 't2',
        type: 'expense',
        amount: 50000,
        categoryId: 'cat_food',
        transactionDate: '2026-09-02', // September (inside)
        createdAt: '2026-09-02T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ];

    const summary = calculateSummary(transactions, sampleCategories, samplePeriod);
    expect(summary.totalExpense).toBe(50000);
    expect(summary.transactionCount).toBe(1);
  });

  it('returns clean zero summary when transactions are empty', () => {
    const summary = calculateSummary([], sampleCategories, samplePeriod);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpense).toBe(0);
    expect(summary.netBalance).toBe(0);
    expect(summary.transactionCount).toBe(0);
    expect(summary.expenseBreakdown).toEqual([]);
    expect(summary.incomeBreakdown).toEqual([]);
  });
});
