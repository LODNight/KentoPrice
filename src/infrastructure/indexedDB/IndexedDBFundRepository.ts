import type { Fund, FundMonthlyConfig } from '../../types';
import type { IFundRepository } from '../../types/repository';
import { openDatabase, STORES } from './db';
import { validateFund, validateFundMonthlyConfig } from '../../domain/validation';

export class IndexedDBFundRepository implements IFundRepository {
  async getAll(includeArchived = false): Promise<Fund[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readonly');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.getAll();

      req.onsuccess = () => {
        let funds = req.result as Fund[];
        if (!includeArchived) {
          funds = funds.filter((f) => !f.isArchived);
        }
        // Sort by order asc, then name asc
        funds.sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.name.localeCompare(b.name, 'vi');
        });
        resolve(funds);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getById(id: string): Promise<Fund | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readonly');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as Fund) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async create(fund: Fund): Promise<void> {
    const allFunds = await this.getAll(true);
    validateFund(fund, allFunds);

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readwrite');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.add(fund);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async update(fund: Fund): Promise<void> {
    const allFunds = await this.getAll(true);
    validateFund(fund, allFunds);

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readwrite');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.put(fund);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async archive(id: string): Promise<void> {
    const fund = await this.getById(id);
    if (!fund) {
      throw new Error(`Quỹ với mã "${id}" không tồn tại.`);
    }

    const updatedFund: Fund = {
      ...fund,
      isArchived: true,
      updatedAt: new Date().toISOString(),
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readwrite');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.put(updatedFund);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async restore(id: string): Promise<void> {
    const fund = await this.getById(id);
    if (!fund) {
      throw new Error(`Quỹ với mã "${id}" không tồn tại.`);
    }

    const allFunds = await this.getAll(true);
    const restoredFund: Fund = {
      ...fund,
      isArchived: false,
      updatedAt: new Date().toISOString(),
    };

    // Validates capacity <= 10 and no name conflict with existing active funds
    validateFund(restoredFund, allFunds);

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUNDS, 'readwrite');
      const store = tx.objectStore(STORES.FUNDS);
      const req = store.put(restoredFund);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async countActive(): Promise<number> {
    const active = await this.getAll(false);
    return active.length;
  }

  async getMonthlyConfig(fundId: string, yearMonth: string): Promise<FundMonthlyConfig | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUND_MONTHLY_CONFIGS, 'readonly');
      const store = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
      const req = store.get(`${fundId}_${yearMonth}`);

      req.onsuccess = () => resolve((req.result as FundMonthlyConfig) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async setMonthlyConfig(config: FundMonthlyConfig): Promise<void> {
    validateFundMonthlyConfig(config);

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUND_MONTHLY_CONFIGS, 'readwrite');
      const store = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
      const req = store.put(config);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getMonthlyConfigsForPeriod(yearMonth: string): Promise<FundMonthlyConfig[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUND_MONTHLY_CONFIGS, 'readonly');
      const store = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
      const index = store.index('yearMonth');
      const req = index.getAll(yearMonth);

      req.onsuccess = () => resolve(req.result as FundMonthlyConfig[]);
      req.onerror = () => reject(req.error);
    });
  }

  async getMonthlyConfigsForFund(fundId: string): Promise<FundMonthlyConfig[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUND_MONTHLY_CONFIGS, 'readonly');
      const store = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
      const index = store.index('fundId');
      const req = index.getAll(fundId);

      req.onsuccess = () => {
        const configs = req.result as FundMonthlyConfig[];
        configs.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        resolve(configs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllMonthlyConfigs(): Promise<FundMonthlyConfig[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FUND_MONTHLY_CONFIGS, 'readonly');
      const store = tx.objectStore(STORES.FUND_MONTHLY_CONFIGS);
      const req = store.getAll();

      req.onsuccess = () => {
        const configs = (req.result as FundMonthlyConfig[]) || [];
        configs.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        resolve(configs);
      };
      req.onerror = () => reject(req.error);
    });
  }
}
