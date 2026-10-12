import type { Transaction, Category, PeriodFilter, SummaryReport, CategoryBreakdown, TransactionType } from '../types';

/**
 * Pure domain function to aggregate transactions by category.
 */
export function aggregateByCategory(
  transactions: Transaction[],
  categories: Category[],
  targetType: TransactionType
): CategoryBreakdown[] {
  // Filter by matching type and strictly positive amount
  const filtered = transactions.filter((t) => t.type === targetType && t.amount > 0);
  const totalTypeAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  // Category lookup map
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Accumulate by category
  const amountMap = new Map<string, { total: number; count: number }>();
  filtered.forEach((t) => {
    const current = amountMap.get(t.categoryId) || { total: 0, count: 0 };
    amountMap.set(t.categoryId, {
      total: current.total + t.amount,
      count: current.count + 1,
    });
  });

  const breakdowns: CategoryBreakdown[] = [];

  amountMap.forEach((val, categoryId) => {
    const cat = categoryMap.get(categoryId);
    const categoryName = cat ? cat.name : 'Chưa phân loại';
    const categoryIcon = cat ? cat.icon : 'help-circle';
    const categoryColor = cat ? cat.color : '#64748B';

    const percentage = totalTypeAmount > 0 ? (val.total / totalTypeAmount) * 100 : 0;

    breakdowns.push({
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      totalAmount: val.total,
      percentage: Math.round(percentage * 10) / 10,
      transactionCount: val.count,
    });
  });

  // Sort descending by totalAmount
  return breakdowns.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Pure calculation function: derives SummaryReport from transactions for a given period.
 */
export function calculateSummary(
  transactions: Transaction[],
  categories: Category[],
  period: PeriodFilter
): SummaryReport {
  // Filter transactions within period
  const periodTransactions = transactions.filter((t) => {
    return t.transactionDate >= period.startDate && t.transactionDate <= period.endDate;
  });

  let totalIncome = 0;
  let totalExpense = 0;

  periodTransactions.forEach((t) => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpense += t.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  const expenseBreakdown = aggregateByCategory(periodTransactions, categories, 'expense');
  const incomeBreakdown = aggregateByCategory(periodTransactions, categories, 'income');

  return {
    period,
    totalIncome,
    totalExpense,
    netBalance,
    expenseBreakdown,
    incomeBreakdown,
    transactionCount: periodTransactions.length,
  };
}
