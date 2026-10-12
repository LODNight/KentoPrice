import { describe, it, expect, vi } from 'vitest';
import {
  formatBackupFilename,
  buildBackupV2,
  generateBackupData,
} from './backup';
import type { ITransactionRepository, ICategoryRepository, IFundRepository } from '../types/repository';
import type { Transaction, Category, Fund, FundMonthlyConfig } from '../types';

describe('Backup JSON v2 Service', () => {
  describe('formatBackupFilename', () => {
    it('should format filename with current date as backup_qlthuchi_YYYYMMDD.json', () => {
      const fixedDate = new Date('2026-10-10T14:30:00.000Z');
      expect(formatBackupFilename(fixedDate)).toBe('backup_qlthuchi_20261010.json');
    });

    it('should pad single-digit months and days with leading zeros', () => {
      const janDate = new Date(2026, 0, 5); // 2026-01-05
      expect(formatBackupFilename(janDate)).toBe('backup_qlthuchi_20260105.json');
    });
  });

  describe('buildBackupV2', () => {
    it('should build a valid schema v2 payload with empty arrays', () => {
      const payload = buildBackupV2({
        transactions: [],
        categories: [],
        funds: [],
        fundMonthlyConfigs: [],
        exportedAt: '2026-10-10T08:00:00.000Z',
      });

      expect(payload.$schema).toBe('https://qlthuchi.local/schemas/v2/backup.json');
      expect(payload.app).toBe('QL_ThuChi');
      expect(payload.version).toBe(2);
      expect(payload.exportedAt).toBe('2026-10-10T08:00:00.000Z');
      expect(payload.data.transactions).toEqual([]);
      expect(payload.data.categories).toEqual([]);
      expect(payload.data.funds).toEqual([]);
      expect(payload.data.fundMonthlyConfigs).toEqual([]);
    });

    it('should build a payload with complete entities and preserve IDs and relationships', () => {
      const mockCategory: Category = {
        id: 'cat_dining',
        name: 'Ăn uống',
        type: 'expense',
        icon: 'coffee',
        color: '#F59E0B',
        isDefault: true,
        isArchived: false,
        order: 1,
        createdAt: '2026-10-01T00:00:00.000Z',
      };

      const mockFund: Fund = {
        id: 'fund_living',
        name: 'Quỹ Sinh Hoạt',
        icon: 'wallet',
        color: '#3B82F6',
        isArchived: false,
        order: 0,
        defaultBudget: 5000000,
        defaultMode: 'rollover',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const mockConfig: FundMonthlyConfig = {
        id: 'fund_living_2026-10',
        fundId: 'fund_living',
        yearMonth: '2026-10',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const mockTxn: Transaction = {
        id: 'txn_001',
        type: 'expense',
        amount: 50000,
        categoryId: 'cat_dining',
        fundId: 'fund_living',
        transactionDate: '2026-10-05',
        note: 'Bữa sáng',
        createdAt: '2026-10-05T01:00:00.000Z',
        updatedAt: '2026-10-05T01:00:00.000Z',
      };

      const payload = buildBackupV2({
        transactions: [mockTxn],
        categories: [mockCategory],
        funds: [mockFund],
        fundMonthlyConfigs: [mockConfig],
        exportedAt: '2026-10-10T10:00:00.000Z',
      });

      // Verify schema headers
      expect(payload.version).toBe(2);
      expect(payload.app).toBe('QL_ThuChi');
      expect(payload.data.transactions).toHaveLength(1);
      expect(payload.data.categories).toHaveLength(1);
      expect(payload.data.funds).toHaveLength(1);
      expect(payload.data.fundMonthlyConfigs).toHaveLength(1);

      // Verify entity relationships are strictly preserved
      const exportedTxn = payload.data.transactions[0];
      expect(exportedTxn.categoryId).toBe(mockCategory.id);
      expect(exportedTxn.fundId).toBe(mockFund.id);

      const exportedConfig = payload.data.fundMonthlyConfigs[0];
      expect(exportedConfig.fundId).toBe(mockFund.id);
      expect(exportedConfig.id).toBe(`${mockFund.id}_2026-10`);

      // Verify no derived balances are present in raw export
      expect((exportedTxn as unknown as Record<string, unknown>).balance).toBeUndefined();
      expect((exportedConfig as unknown as Record<string, unknown>).currentBalance).toBeUndefined();
      expect((exportedConfig as unknown as Record<string, unknown>).openingBalance).toBeUndefined();
      expect((exportedConfig as unknown as Record<string, unknown>).monthlySpending).toBeUndefined();
    });
  });

  describe('generateBackupData', () => {
    it('should query repositories with includeArchived=true for funds and fetch all data', async () => {
      const mockTxns: Transaction[] = [];
      const mockCats: Category[] = [];
      const mockFunds: Fund[] = [
        {
          id: 'fund_archived',
          name: 'Quỹ Cũ Đã Ẩn',
          icon: 'archive',
          color: '#888888',
          isArchived: true,
          order: 99,
          defaultBudget: 0,
          defaultMode: 'reset',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const mockConfigs: FundMonthlyConfig[] = [];

      const mockTxRepo: Partial<ITransactionRepository> = {
        getAll: vi.fn().mockResolvedValue(mockTxns),
      };
      const mockCatRepo: Partial<ICategoryRepository> = {
        getAll: vi.fn().mockResolvedValue(mockCats),
      };
      const mockFundRepo: Partial<IFundRepository> = {
        getAll: vi.fn().mockResolvedValue(mockFunds),
        getAllMonthlyConfigs: vi.fn().mockResolvedValue(mockConfigs),
      };

      const result = await generateBackupData(
        mockTxRepo as ITransactionRepository,
        mockCatRepo as ICategoryRepository,
        mockFundRepo as IFundRepository
      );

      expect(mockTxRepo.getAll).toHaveBeenCalledOnce();
      expect(mockCatRepo.getAll).toHaveBeenCalledOnce();
      expect(mockFundRepo.getAll).toHaveBeenCalledWith(true); // Must include archived!
      expect(mockFundRepo.getAllMonthlyConfigs).toHaveBeenCalledOnce();

      expect(result.data.funds).toHaveLength(1);
      expect(result.data.funds[0].isArchived).toBe(true);
    });

    it('should throw and not swallow repository errors', async () => {
      const mockTxRepo: Partial<ITransactionRepository> = {
        getAll: vi.fn().mockRejectedValue(new Error('IndexedDB read error')),
      };
      const mockCatRepo: Partial<ICategoryRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
      };
      const mockFundRepo: Partial<IFundRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
        getAllMonthlyConfigs: vi.fn().mockResolvedValue([]),
      };

      await expect(
        generateBackupData(
          mockTxRepo as ITransactionRepository,
          mockCatRepo as ICategoryRepository,
          mockFundRepo as IFundRepository
        )
      ).rejects.toThrow('IndexedDB read error');
    });
  });
});
