import type { Transaction, Category, Fund, FundMonthlyConfig } from '../types';
import type { ITransactionRepository, ICategoryRepository, IFundRepository } from '../types/repository';
import { transactionRepository, categoryRepository, fundRepository } from './index';

export interface BackupV2Payload {
  $schema: string;
  app: string;
  version: 2;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    funds: Fund[];
    fundMonthlyConfigs: FundMonthlyConfig[];
  };
}

/**
 * Format backup filename according to specification: backup_qlthuchi_YYYYMMDD.json
 */
export function formatBackupFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `backup_qlthuchi_${yyyy}${mm}${dd}.json`;
}

/**
 * Pure builder function to construct valid schema v2 backup structure.
 * Guarantees no derived balances are exported and entity links remain intact.
 */
export function buildBackupV2(params: {
  transactions: Transaction[];
  categories: Category[];
  funds: Fund[];
  fundMonthlyConfigs: FundMonthlyConfig[];
  exportedAt?: string;
}): BackupV2Payload {
  return {
    $schema: 'https://qlthuchi.local/schemas/v2/backup.json',
    app: 'QL_ThuChi',
    version: 2,
    exportedAt: params.exportedAt || new Date().toISOString(),
    data: {
      transactions: params.transactions,
      categories: params.categories,
      funds: params.funds,
      fundMonthlyConfigs: params.fundMonthlyConfigs,
    },
  };
}

/**
 * Reads all source data from repositories and generates schema v2 payload.
 * Read-only operation: does not mutate or erase any data in storage.
 */
export async function generateBackupData(
  transactionRepo: ITransactionRepository = transactionRepository,
  categoryRepo: ICategoryRepository = categoryRepository,
  fundRepo: IFundRepository = fundRepository,
  now: Date = new Date()
): Promise<BackupV2Payload> {
  const [transactions, categories, funds, fundMonthlyConfigs] = await Promise.all([
    transactionRepo.getAll(),
    categoryRepo.getAll(),
    fundRepo.getAll(true),
    fundRepo.getAllMonthlyConfigs(),
  ]);

  return buildBackupV2({
    transactions,
    categories,
    funds,
    fundMonthlyConfigs,
    exportedAt: now.toISOString(),
  });
}

/**
 * Triggers browser file download using Blob and ObjectURL.
 */
export function downloadJsonFile(filename: string, content: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-level orchestration function to export data and initiate browser download.
 */
export async function exportAndDownloadBackup(
  transactionRepo: ITransactionRepository = transactionRepository,
  categoryRepo: ICategoryRepository = categoryRepository,
  fundRepo: IFundRepository = fundRepository
): Promise<{ filename: string; payload: BackupV2Payload }> {
  const now = new Date();
  const filename = formatBackupFilename(now);
  const payload = await generateBackupData(transactionRepo, categoryRepo, fundRepo, now);
  const jsonString = JSON.stringify(payload, null, 2);
  downloadJsonFile(filename, jsonString);
  return { filename, payload };
}
