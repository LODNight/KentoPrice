import { IndexedDBCategoryRepository } from '../infrastructure/indexedDB/IndexedDBCategoryRepository';
import { IndexedDBTransactionRepository } from '../infrastructure/indexedDB/IndexedDBTransactionRepository';
import { IndexedDBFundRepository } from '../infrastructure/indexedDB/IndexedDBFundRepository';
import type { ICategoryRepository, ITransactionRepository, IFundRepository } from '../types/repository';

export const categoryRepository: ICategoryRepository = new IndexedDBCategoryRepository();
export const transactionRepository: ITransactionRepository = new IndexedDBTransactionRepository(categoryRepository);
export const fundRepository: IFundRepository = new IndexedDBFundRepository();
