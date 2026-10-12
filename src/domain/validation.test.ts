import { describe, it, expect } from 'vitest';
import { validateTransaction, validateCategory } from './validation';
import { ValidationError, CategoryTypeMismatchError } from './errors';
import type { Transaction, Category } from '../types';

describe('domain validation', () => {
  const expenseCategory: Category = {
    id: 'cat_food',
    name: 'Ăn uống',
    type: 'expense',
    icon: 'Utensils',
    color: '#F59E0B',
    isDefault: true,
    isArchived: false,
    order: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
  };

  const incomeCategory: Category = {
    id: 'cat_salary',
    name: 'Tiền lương',
    type: 'income',
    icon: 'Banknote',
    color: '#10B981',
    isDefault: true,
    isArchived: false,
    order: 2,
    createdAt: '2026-09-01T00:00:00.000Z',
  };

  describe('validateTransaction', () => {
    const validExpenseTxn: Transaction = {
      id: 'txn_123',
      type: 'expense',
      amount: 45000,
      categoryId: 'cat_food',
      transactionDate: '2026-09-30',
      note: 'Bát phở bò',
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T10:00:00.000Z',
    };

    it('passes for a fully valid transaction matching its category type', () => {
      expect(() => validateTransaction(validExpenseTxn, expenseCategory)).not.toThrow();
    });

    it('throws CategoryTypeMismatchError when expense references income category', () => {
      expect(() => validateTransaction(validExpenseTxn, incomeCategory)).toThrow(
        CategoryTypeMismatchError
      );
    });

    it('throws CategoryTypeMismatchError when income references expense category', () => {
      const validIncomeTxn: Transaction = {
        ...validExpenseTxn,
        type: 'income',
        amount: 10000000,
      };
      expect(() => validateTransaction(validIncomeTxn, expenseCategory)).toThrow(
        CategoryTypeMismatchError
      );
    });

    it('rejects zero or negative amount', () => {
      expect(() =>
        validateTransaction({ ...validExpenseTxn, amount: 0 }, expenseCategory)
      ).toThrow(ValidationError);

      expect(() =>
        validateTransaction({ ...validExpenseTxn, amount: -45000 }, expenseCategory)
      ).toThrow(ValidationError);
    });

    it('rejects floating-point amount', () => {
      expect(() =>
        validateTransaction({ ...validExpenseTxn, amount: 45000.5 }, expenseCategory)
      ).toThrow(ValidationError);
    });

    it('rejects invalid transactionDate formats', () => {
      expect(() =>
        validateTransaction(
          { ...validExpenseTxn, transactionDate: '30/09/2026' },
          expenseCategory
        )
      ).toThrow(ValidationError);

      expect(() =>
        validateTransaction(
          { ...validExpenseTxn, transactionDate: '2026-13-45' },
          expenseCategory
        )
      ).toThrow(ValidationError);
    });

    it('rejects notes longer than 200 characters', () => {
      const longNote = 'A'.repeat(201);
      expect(() =>
        validateTransaction({ ...validExpenseTxn, note: longNote }, expenseCategory)
      ).toThrow(ValidationError);
    });
  });

  describe('validateCategory', () => {
    it('passes for valid category', () => {
      expect(() => validateCategory(expenseCategory)).not.toThrow();
    });

    it('rejects empty name or invalid type', () => {
      expect(() => validateCategory({ ...expenseCategory, name: '' })).toThrow(ValidationError);
      expect(() =>
        validateCategory({ ...expenseCategory, type: 'invalid' as any })
      ).toThrow(ValidationError);
    });
  });

  describe('validateFund', () => {
    const validFund: import('../types').Fund = {
      id: 'fund_1',
      name: 'Quỹ Sinh Hoạt',
      icon: 'Wallet',
      color: '#3B82F6',
      isArchived: false,
      order: 0,
      defaultBudget: 5000000,
      defaultMode: 'rollover',
      createdAt: '2026-10-09T00:00:00.000Z',
      updatedAt: '2026-10-09T00:00:00.000Z',
    };

    it('passes for a valid fund', () => {
      expect(() => import('./validation').then(m => m.validateFund(validFund))).toBeDefined();
    });

    it('allows budget === 0 (PDR-011)', async () => {
      const { validateFund } = await import('./validation');
      expect(() => validateFund({ ...validFund, defaultBudget: 0 })).not.toThrow();
    });

    it('rejects negative defaultBudget', async () => {
      const { validateFund } = await import('./validation');
      expect(() => validateFund({ ...validFund, defaultBudget: -1000 })).toThrow(ValidationError);
    });

    it('enforces maximum 10 active funds capacity (PDR-009, R-CAP-01)', async () => {
      const { validateFund } = await import('./validation');
      const activeFunds: import('../types').Fund[] = Array.from({ length: 10 }, (_, i) => ({
        ...validFund,
        id: `fund_${i}`,
        name: `Quỹ ${i}`,
      }));

      // Adding the 11th new fund must throw ValidationError
      const newFund: import('../types').Fund = { ...validFund, id: 'fund_new', name: 'Quỹ Mới' };
      expect(() => validateFund(newFund, activeFunds)).toThrow(ValidationError);

      // Updating an existing fund within the 10 must NOT throw
      expect(() => validateFund(activeFunds[0], activeFunds)).not.toThrow();
    });

    it('enforces unique name among active funds case-insensitively with trimming (PDR-015, R-NAME-01)', async () => {
      const { validateFund } = await import('./validation');
      const existing: import('../types').Fund[] = [validFund];

      const duplicateFund: import('../types').Fund = {
        ...validFund,
        id: 'fund_2',
        name: '  quỹ sinh hoạt  ', // same after trim & lowercase
      };

      expect(() => validateFund(duplicateFund, existing)).toThrow(ValidationError);
    });
  });

  describe('validateFundMonthlyConfig', () => {
    it('validates correct config and rejects invalid yearMonth or id mismatch', async () => {
      const { validateFundMonthlyConfig } = await import('./validation');
      const validConfig: import('../types').FundMonthlyConfig = {
        id: 'fund_1_2026-10',
        fundId: 'fund_1',
        yearMonth: '2026-10',
        monthlyBudget: 5000000,
        budgetMode: 'rollover',
        updatedAt: '2026-10-09T00:00:00.000Z',
      };

      expect(() => validateFundMonthlyConfig(validConfig)).not.toThrow();

      expect(() =>
        validateFundMonthlyConfig({ ...validConfig, yearMonth: '2026-13' })
      ).toThrow(ValidationError);

      expect(() =>
        validateFundMonthlyConfig({ ...validConfig, id: 'wrong_id' })
      ).toThrow(ValidationError);
    });
  });

  describe('validateCategoryUniqueness (PDR-023)', () => {
    const existingCats: Category[] = [
      {
        id: 'cat_1',
        name: 'Ăn uống',
        type: 'expense',
        icon: 'utensils',
        color: '#F59E0B',
        isDefault: true,
        isArchived: false,
        order: 1,
        createdAt: '2026-10-09T00:00:00.000Z',
      },
      {
        id: 'cat_2',
        name: 'Lương',
        type: 'income',
        icon: 'banknote',
        color: '#10B981',
        isDefault: true,
        isArchived: false,
        order: 2,
        createdAt: '2026-10-09T00:00:00.000Z',
      },
    ];

    it('allows unique category name within same type', async () => {
      const { validateCategoryUniqueness } = await import('./validation');
      const newCat: Category = {
        id: 'cat_3',
        name: 'Mua sắm',
        type: 'expense',
        icon: 'shoppingbag',
        color: '#3B82F6',
        isDefault: false,
        isArchived: false,
        order: 3,
        createdAt: '2026-10-09T00:00:00.000Z',
      };
      expect(() => validateCategoryUniqueness(newCat, existingCats)).not.toThrow();
    });

    it('rejects duplicate name in same type (case & trim insensitive)', async () => {
      const { validateCategoryUniqueness } = await import('./validation');
      const duplicateCat: Category = {
        id: 'cat_4',
        name: '  ăn Uống  ',
        type: 'expense',
        icon: 'coffee',
        color: '#3B82F6',
        isDefault: false,
        isArchived: false,
        order: 4,
        createdAt: '2026-10-09T00:00:00.000Z',
      };
      expect(() => validateCategoryUniqueness(duplicateCat, existingCats)).toThrow(ValidationError);
    });

    it('allows same name across different types (e.g. Thu "Khác" vs Chi "Khác")', async () => {
      const { validateCategoryUniqueness } = await import('./validation');
      const diffTypeCat: Category = {
        id: 'cat_5',
        name: 'Ăn uống',
        type: 'income',
        icon: 'banknote',
        color: '#10B981',
        isDefault: false,
        isArchived: false,
        order: 5,
        createdAt: '2026-10-09T00:00:00.000Z',
      };
      expect(() => validateCategoryUniqueness(diffTypeCat, existingCats)).not.toThrow();
    });

    it('allows editing current category with its own name unchanged', async () => {
      const { validateCategoryUniqueness } = await import('./validation');
      expect(() => validateCategoryUniqueness(existingCats[0], existingCats)).not.toThrow();
    });
  });
});

