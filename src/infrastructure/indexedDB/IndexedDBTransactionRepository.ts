import type { Transaction } from '../../types';
import type { ITransactionRepository, ICategoryRepository } from '../../types/repository';
import { openDatabase, STORES } from './db';
import { validateTransaction } from '../../domain/validation';
import { normalizeDateString } from '../../utils/date';

export class IndexedDBTransactionRepository implements ITransactionRepository {
  private categoryRepo: ICategoryRepository;

  constructor(categoryRepo: ICategoryRepository) {
    this.categoryRepo = categoryRepo;
  }

  private async autoHealTransactions(list: Transaction[]): Promise<Transaction[]> {
    const corrupted: Transaction[] = [];
    const healedList = list.map((t) => {
      const normalizedDate = normalizeDateString(t.transactionDate);
      if (normalizedDate !== t.transactionDate) {
        const fixed = { ...t, transactionDate: normalizedDate };
        corrupted.push(fixed);
        return fixed;
      }
      return t;
    });

    if (corrupted.length > 0) {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
        const store = tx.objectStore(STORES.TRANSACTIONS);
        corrupted.forEach((t) => store.put(t));
      } catch (err) {
        console.warn('Failed to auto-heal transactions in IndexedDB:', err);
      }
    }

    return healedList;
  }

  async getAll(): Promise<Transaction[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.getAll();

      req.onsuccess = async () => {
        let list = req.result as Transaction[];
        list = await this.autoHealTransactions(list);
        // Sort descending by date, then createdAt
        list.sort((a, b) => {
          const dCmp = b.transactionDate.localeCompare(a.transactionDate);
          if (dCmp !== 0) return dCmp;
          return b.createdAt.localeCompare(a.createdAt);
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getByPeriod(startDate: string, endDate: string): Promise<Transaction[]> {
    const all = await this.getAll();
    return all.filter((t) => t.transactionDate >= startDate && t.transactionDate <= endDate);
  }

  async getById(id: string): Promise<Transaction | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as Transaction) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async create(transaction: Transaction): Promise<void> {
    transaction.transactionDate = normalizeDateString(transaction.transactionDate);

    // 1. Verify category exists and matches transaction type
    const category = await this.categoryRepo.getById(transaction.categoryId);
    if (!category) {
      throw new Error(`Danh mục với ID "${transaction.categoryId}" không tồn tại.`);
    }

    // 2. Domain validation (cross-entity invariant)
    validateTransaction(transaction, category);

    // 3. Persist to IndexedDB
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.add(transaction);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async update(transaction: Transaction): Promise<void> {
    transaction.transactionDate = normalizeDateString(transaction.transactionDate);

    // 1. Verify category exists and matches transaction type
    const category = await this.categoryRepo.getById(transaction.categoryId);
    if (!category) {
      throw new Error(`Danh mục với ID "${transaction.categoryId}" không tồn tại.`);
    }

    // 2. Domain validation
    validateTransaction(transaction, category);

    // 3. Update in IndexedDB
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.put(transaction);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getByFund(fundId: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const index = store.index('fundId');
      const req = index.getAll(fundId);

      req.onsuccess = () => {
        let list = (req.result as Transaction[]).map((t) => ({
          ...t,
          transactionDate: normalizeDateString(t.transactionDate),
        }));
        if (startDate && endDate) {
          list = list.filter((t) => t.transactionDate >= startDate && t.transactionDate <= endDate);
        }
        list.sort((a, b) => {
          const dCmp = b.transactionDate.localeCompare(a.transactionDate);
          if (dCmp !== 0) return dCmp;
          return b.createdAt.localeCompare(a.createdAt);
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }
}
