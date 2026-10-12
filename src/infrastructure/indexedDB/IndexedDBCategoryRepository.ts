import type { Category, TransactionType } from '../../types';
import type { ICategoryRepository } from '../../types/repository';
import { openDatabase, STORES } from './db';
import { validateCategory } from '../../domain/validation';

export class IndexedDBCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readonly');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.getAll();

      req.onsuccess = () => {
        const categories = (req.result as Category[]).sort((a, b) => a.order - b.order);
        resolve(categories);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getActive(type?: TransactionType): Promise<Category[]> {
    const all = await this.getAll();
    return all.filter((c) => {
      if (c.isArchived) return false;
      if (type && c.type !== type) return false;
      return true;
    });
  }

  async getById(id: string): Promise<Category | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readonly');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as Category) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async create(category: Category): Promise<void> {
    validateCategory(category);
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.add(category);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async update(category: Category): Promise<void> {
    validateCategory(category);
    const db = await openDatabase();

    // Check if category exists
    const existing = await this.getById(category.id);
    if (!existing) {
      throw new Error(`Không tìm thấy danh mục với ID: ${category.id}`);
    }

    // Invariant: If category type changed, check if any transactions reference this category
    if (existing.type !== category.type) {
      const hasTransactions = await this.hasReferencingTransactions(category.id);
      if (hasTransactions) {
        throw new Error(
          'Không thể thay đổi loại danh mục (Thu/Chi) khi đã có giao dịch sử dụng danh mục này. Vui lòng lưu trữ (archive) danh mục cũ và tạo danh mục mới.'
        );
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.put(category);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async archive(id: string): Promise<void> {
    const cat = await this.getById(id);
    if (!cat) {
      throw new Error(`Không tìm thấy danh mục với ID: ${id}`);
    }

    cat.isArchived = true;
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.put(cat);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async restore(id: string): Promise<void> {
    const cat = await this.getById(id);
    if (!cat) {
      throw new Error(`Không tìm thấy danh mục với ID: ${id}`);
    }

    cat.isArchived = false;
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.put(cat);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    const cat = await this.getById(id);
    if (!cat) {
      throw new Error(`Không tìm thấy danh mục với ID: ${id}`);
    }

    const txnCount = await this.countReferencingTransactions(id);
    if (txnCount > 0) {
      throw new Error(
        `Không thể xóa vĩnh viễn danh mục này vì đang có ${txnCount} giao dịch tham chiếu. Vui lòng sử dụng tính năng Ẩn danh mục thay thế.`
      );
    }

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async countReferencingTransactions(categoryId: string): Promise<number> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const index = store.index('categoryId');
      const req = index.count(IDBKeyRange.only(categoryId));

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async seedDefaults(defaults: Category[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);

      defaults.forEach((c) => store.put(c));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async hasReferencingTransactions(categoryId: string): Promise<boolean> {
    const count = await this.countReferencingTransactions(categoryId);
    return count > 0;
  }
}
