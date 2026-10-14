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

    it('should strictly perform read-only operations and never invoke mutating methods', async () => {
      const mockTxRepo = {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      const mockCatRepo = {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        archive: vi.fn(),
        restore: vi.fn(),
      };
      const mockFundRepo = {
        getAll: vi.fn().mockResolvedValue([]),
        getAllMonthlyConfigs: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        setMonthlyConfig: vi.fn(),
        archive: vi.fn(),
        restore: vi.fn(),
      };

      await generateBackupData(
        mockTxRepo as unknown as ITransactionRepository,
        mockCatRepo as unknown as ICategoryRepository,
        mockFundRepo as unknown as IFundRepository
      );

      // Verify no mutating methods were called
      expect(mockTxRepo.create).not.toHaveBeenCalled();
      expect(mockTxRepo.update).not.toHaveBeenCalled();
      expect(mockTxRepo.delete).not.toHaveBeenCalled();
      expect(mockCatRepo.create).not.toHaveBeenCalled();
      expect(mockCatRepo.update).not.toHaveBeenCalled();
      expect(mockCatRepo.delete).not.toHaveBeenCalled();
      expect(mockFundRepo.create).not.toHaveBeenCalled();
      expect(mockFundRepo.update).not.toHaveBeenCalled();
      expect(mockFundRepo.setMonthlyConfig).not.toHaveBeenCalled();
      expect(mockFundRepo.archive).not.toHaveBeenCalled();
    });

    it('should produce a JSON-serializable backup conforming exactly to DATA_CONTRACT v2 specification', async () => {
      const fixedNow = new Date('2026-10-12T08:00:00.000Z');
      const mockTxRepo: Partial<ITransactionRepository> = {
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'txn_test_1',
            type: 'expense',
            amount: 50000,
            categoryId: 'cat_coffee',
            fundId: 'fund_life_01',
            transactionDate: '2026-10-12',
            note: 'Cà phê sáng',
            createdAt: '2026-10-12T01:00:00.000Z',
            updatedAt: '2026-10-12T01:00:00.000Z',
          },
        ]),
      };
      const mockCatRepo: Partial<ICategoryRepository> = {
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'cat_coffee',
            name: 'Cà phê',
            type: 'expense',
            icon: 'coffee',
            color: '#F59E0B',
            isDefault: false,
            isArchived: false,
            order: 1,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]),
      };
      const mockFundRepo: Partial<IFundRepository> = {
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'fund_life_01',
            name: 'Quỹ Sinh Hoạt',
            icon: 'wallet',
            color: '#3B82F6',
            isArchived: false,
            order: 0,
            defaultBudget: 5000000,
            defaultMode: 'rollover',
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        ]),
        getAllMonthlyConfigs: vi.fn().mockResolvedValue([
          {
            id: 'fund_life_01_2026-10',
            fundId: 'fund_life_01',
            yearMonth: '2026-10',
            monthlyBudget: 5000000,
            budgetMode: 'rollover',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
        ]),
      };

      const backup = await generateBackupData(
        mockTxRepo as ITransactionRepository,
        mockCatRepo as ICategoryRepository,
        mockFundRepo as IFundRepository,
        fixedNow
      );

      const jsonString = JSON.stringify(backup, null, 2);
      const parsed = JSON.parse(jsonString);

      expect(parsed.$schema).toBe('https://qlthuchi.local/schemas/v2/backup.json');
      expect(parsed.app).toBe('QL_ThuChi');
      expect(parsed.version).toBe(2);
      expect(parsed.exportedAt).toBe('2026-10-12T08:00:00.000Z');
      expect(parsed.data.transactions[0].id).toBe('txn_test_1');
      expect(parsed.data.transactions[0].categoryId).toBe('cat_coffee');
      expect(parsed.data.transactions[0].fundId).toBe('fund_life_01');
      expect(parsed.data.categories[0].id).toBe('cat_coffee');
      expect(parsed.data.funds[0].id).toBe('fund_life_01');
      expect(parsed.data.fundMonthlyConfigs[0].id).toBe('fund_life_01_2026-10');
    });
  });

  describe('exportAndDownloadBackup & Browser Download Handling', () => {
    it('should reject and propagate error if any repository fails during backup preparation', async () => {
      const mockTxRepo: Partial<ITransactionRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
      };
      const mockCatRepo: Partial<ICategoryRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
      };
      const mockFundRepo: Partial<IFundRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
        getAllMonthlyConfigs: vi.fn().mockRejectedValue(new Error('IndexedDB config store corrupted')),
      };

      const { exportAndDownloadBackup } = await import('./backup');

      await expect(
        exportAndDownloadBackup(
          mockTxRepo as ITransactionRepository,
          mockCatRepo as ICategoryRepository,
          mockFundRepo as IFundRepository
        )
      ).rejects.toThrow('IndexedDB config store corrupted');
    });

    it('should successfully return filename and schema v2 payload when repositories succeed', async () => {
      const mockTxRepo: Partial<ITransactionRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
      };
      const mockCatRepo: Partial<ICategoryRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
      };
      const mockFundRepo: Partial<IFundRepository> = {
        getAll: vi.fn().mockResolvedValue([]),
        getAllMonthlyConfigs: vi.fn().mockResolvedValue([]),
      };

      const { exportAndDownloadBackup } = await import('./backup');

      const result = await exportAndDownloadBackup(
        mockTxRepo as ITransactionRepository,
        mockCatRepo as ICategoryRepository,
        mockFundRepo as IFundRepository
      );

      expect(result.filename).toMatch(/^backup_qlthuchi_\d{8}\.json$/);
      expect(result.payload.version).toBe(2);
      expect(result.payload.app).toBe('QL_ThuChi');
      expect(result.payload.data).toBeDefined();
    });

    it('should safely no-op downloadJsonFile in non-browser Node environments', async () => {
      const { downloadJsonFile } = await import('./backup');

      // In Node environment, window and document are undefined. Must not throw!
      expect(() => {
        downloadJsonFile('test.json', '{"test": true}');
      }).not.toThrow();
    });
  });
});

