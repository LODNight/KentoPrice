import { StorageUnavailableError } from '../../domain/errors';
import { DEFAULT_CATEGORIES } from './initialCategories';

export const DB_NAME = 'ql_thuchi_db';
export const DB_VERSION = 2;

export const STORES = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  METADATA: 'metadata',
  FUNDS: 'funds',
  FUND_MONTHLY_CONFIGS: 'fund_monthly_configs',
} as const;

let dbInstance: IDBDatabase | null = null;

/**
 * Checks if IndexedDB is available in the current browser environment.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Opens or returns the cached connection to IndexedDB.
 * Throws StorageUnavailableError if unavailable.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (!isIndexedDBAvailable()) {
    return Promise.reject(new StorageUnavailableError());
  }

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;

    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return reject(new StorageUnavailableError());
    }

    request.onerror = () => {
      reject(new StorageUnavailableError('Không thể mở cơ sở dữ liệu IndexedDB.'));
    };

    request.onblocked = () => {
      reject(new StorageUnavailableError('Cơ sở dữ liệu đang bị khóa bởi một tab khác. Vui lòng đóng các tab cũ và thử lại.'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const upgradeTx = (event.target as IDBOpenDBRequest).transaction;

      // 1. Transactions Store
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txnStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        txnStore.createIndex('transactionDate', 'transactionDate', { unique: false });
        txnStore.createIndex('categoryId', 'categoryId', { unique: false });
        txnStore.createIndex('type', 'type', { unique: false });
        txnStore.createIndex('fundId', 'fundId', { unique: false });
      } else if (upgradeTx) {
        // Upgrade from v1: ensure fundId index exists
        const txnStore = upgradeTx.objectStore(STORES.TRANSACTIONS);
        if (!txnStore.indexNames.contains('fundId')) {
          txnStore.createIndex('fundId', 'fundId', { unique: false });
        }
      }

      // 2. Categories Store
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        catStore.createIndex('type', 'type', { unique: false });
        catStore.createIndex('isArchived', 'isArchived', { unique: false });
      }

      // 3. Metadata Store
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      // 4. Funds Store (v2)
      if (!db.objectStoreNames.contains(STORES.FUNDS)) {
        const fundStore = db.createObjectStore(STORES.FUNDS, { keyPath: 'id' });
        fundStore.createIndex('isArchived', 'isArchived', { unique: false });
        fundStore.createIndex('order', 'order', { unique: false });
      }

      // 5. Fund Monthly Configs Store (v2 - Normalized Store PDR-018)
      if (!db.objectStoreNames.contains(STORES.FUND_MONTHLY_CONFIGS)) {
        const configStore = db.createObjectStore(STORES.FUND_MONTHLY_CONFIGS, { keyPath: 'id' });
        configStore.createIndex('fundId', 'fundId', { unique: false });
        configStore.createIndex('yearMonth', 'yearMonth', { unique: false });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      dbInstance = db;

      db.onversionchange = () => {
        db.close();
        dbInstance = null;
      };

      try {
        // Seed default categories if newly initialized
        await seedCategoriesIfEmpty(db);
        resolve(db);
      } catch (err) {
        reject(err);
      }
    };
  });
}

/**
 * Checks if categories are empty and seeds default categories.
 */
function seedCategoriesIfEmpty(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CATEGORIES, STORES.METADATA], 'readwrite');
    const catStore = tx.objectStore(STORES.CATEGORIES);
    const metaStore = tx.objectStore(STORES.METADATA);

    const countReq = catStore.count();

    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        // Seed default categories
        DEFAULT_CATEGORIES.forEach((cat) => {
          catStore.put(cat);
        });

        // Seed metadata
        metaStore.put({ key: 'schemaVersion', value: DB_VERSION });
        metaStore.put({ key: 'installedAt', value: new Date().toISOString() });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * For testing purposes: closes the open database instance.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
