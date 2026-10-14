import type { Transaction, Category, Fund, FundMonthlyConfig } from '../types';
import type { ITransactionRepository, ICategoryRepository, IFundRepository } from '../types/repository';
import { transactionRepository, categoryRepository, fundRepository } from './index';
import { openDatabase, STORES } from '../infrastructure/indexedDB/db';
import { DEFAULT_CATEGORIES } from '../infrastructure/indexedDB/initialCategories';

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

/**
 * Restores a snapshot payload into IndexedDB.
 * Safely replaces local transactions, categories, funds, and fundMonthlyConfigs.
 */
export async function restoreSnapshotToDatabase(
  data: BackupV2Payload['data']
): Promise<{ counts: { transactions: number; categories: number; funds: number; fundMonthlyConfigs: number } }> {
  if (!data) {
    throw new Error('Dữ liệu khôi phục không hợp lệ.');
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.TRANSACTIONS, STORES.CATEGORIES, STORES.FUNDS, STORES.FUND_MONTHLY_CONFIGS, STORES.METADATA],
      'readwrite'
    );

    const txnStore = tx.objectStore(STORES.TRANSACTIONS);
    const catStore = tx.objectStore(STORES.CATEGORIES);
    const fundStore = tx.objectStore(STORES.FUNDS);
    const configStore = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
    const metaStore = tx.objectStore(STORES.METADATA);

    // Clear existing stores for authoritative snapshot synchronization
    txnStore.clear();
    catStore.clear();
    fundStore.clear();
    configStore.clear();

    // 1. Categories
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      data.categories.forEach((cat) => catStore.put(cat));
    } else {
      DEFAULT_CATEGORIES.forEach((cat) => catStore.put(cat));
    }

    // 2. Funds
    if (Array.isArray(data.funds)) {
      data.funds.forEach((fund) => fundStore.put(fund));
    }

    // 3. FundMonthlyConfigs
    if (Array.isArray(data.fundMonthlyConfigs)) {
      data.fundMonthlyConfigs.forEach((cfg) => configStore.put(cfg));
    }

    // 4. Transactions
    if (Array.isArray(data.transactions)) {
      data.transactions.forEach((txn) => txnStore.put(txn));
    }

    metaStore.put({ key: 'lastRestoredAt', value: new Date().toISOString() });

    tx.oncomplete = () => {
      resolve({
        counts: {
          transactions: data.transactions?.length || 0,
          categories: data.categories?.length || 0,
          funds: data.funds?.length || 0,
          fundMonthlyConfigs: data.fundMonthlyConfigs?.length || 0,
        },
      });
    };

    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Khôi phục cơ sở dữ liệu thất bại (Transaction Aborted).'));
  });
}

