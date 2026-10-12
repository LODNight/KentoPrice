import type { Transaction, Category, TransactionType, Fund, FundMonthlyConfig } from './index';

export interface ITransactionRepository {
  getAll(): Promise<Transaction[]>;
  getByPeriod(startDate: string, endDate: string): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  create(transaction: Transaction): Promise<void>;
  update(transaction: Transaction): Promise<void>;
  delete(id: string): Promise<void>;
  getByFund(fundId: string, startDate?: string, endDate?: string): Promise<Transaction[]>;
}

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
  getActive(type?: TransactionType): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(category: Category): Promise<void>;
  update(category: Category): Promise<void>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  countReferencingTransactions(categoryId: string): Promise<number>;
  seedDefaults(defaults: Category[]): Promise<void>;
}

export interface IFundRepository {
  getAll(includeArchived?: boolean): Promise<Fund[]>;
  getById(id: string): Promise<Fund | null>;
  create(fund: Fund): Promise<void>;
  update(fund: Fund): Promise<void>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  countActive(): Promise<number>;
  getMonthlyConfig(fundId: string, yearMonth: string): Promise<FundMonthlyConfig | null>;
  setMonthlyConfig(config: FundMonthlyConfig): Promise<void>;
  getMonthlyConfigsForPeriod(yearMonth: string): Promise<FundMonthlyConfig[]>;
  getMonthlyConfigsForFund(fundId: string): Promise<FundMonthlyConfig[]>;
  getAllMonthlyConfigs(): Promise<FundMonthlyConfig[]>;
}
