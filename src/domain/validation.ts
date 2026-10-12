import type { Transaction, Category } from '../types';
import { ValidationError, CategoryTypeMismatchError } from './errors';
import { isValidDateString } from '../utils/date';
import { isValidVNDAmount, isValidBudgetAmount } from '../utils/currency';

/**
 * Validates a transaction against domain invariants.
 * Throws ValidationError or CategoryTypeMismatchError if invalid.
 */
export function validateTransaction(transaction: Transaction, category?: Category | null): void {
  if (!transaction.id || typeof transaction.id !== 'string' || transaction.id.trim() === '') {
    throw new ValidationError('Mã giao dịch (id) không hợp lệ', 'id');
  }

  if (transaction.type !== 'expense' && transaction.type !== 'income') {
    throw new ValidationError('Loại giao dịch phải là "expense" hoặc "income"', 'type');
  }

  if (!isValidVNDAmount(transaction.amount)) {
    throw new ValidationError('Số tiền phải là số nguyên dương lớn hơn 0 và không vượt quá 1.000 tỷ VND', 'amount');
  }

  if (!transaction.categoryId || typeof transaction.categoryId !== 'string' || transaction.categoryId.trim() === '') {
    throw new ValidationError('Danh mục giao dịch không được để trống', 'categoryId');
  }

  if (!transaction.transactionDate || !isValidDateString(transaction.transactionDate)) {
    throw new ValidationError('Ngày giao dịch phải theo định dạng YYYY-MM-DD hợp lệ', 'transactionDate');
  }

  if (transaction.note && transaction.note.length > 200) {
    throw new ValidationError('Ghi chú không được vượt quá 200 ký tự', 'note');
  }

  if (!transaction.createdAt || isNaN(Date.parse(transaction.createdAt))) {
    throw new ValidationError('Thời gian tạo (createdAt) không hợp lệ', 'createdAt');
  }

  if (!transaction.updatedAt || isNaN(Date.parse(transaction.updatedAt))) {
    throw new ValidationError('Thời gian cập nhật (updatedAt) không hợp lệ', 'updatedAt');
  }

  if (transaction.fundId !== undefined && transaction.fundId !== null) {
    if (typeof transaction.fundId !== 'string' || transaction.fundId.trim() === '') {
      throw new ValidationError('Mã Quỹ (fundId) không hợp lệ', 'fundId');
    }
  }

  // Cross-entity integrity: Category type must match transaction type
  if (category) {
    if (category.type !== transaction.type) {
      throw new CategoryTypeMismatchError(transaction.type, category.type);
    }
  }
}

/**
 * Validates a category against domain invariants.
 */
export function validateCategory(category: Category): void {
  if (!category.id || typeof category.id !== 'string' || category.id.trim() === '') {
    throw new ValidationError('Mã danh mục (id) không hợp lệ', 'id');
  }

  if (!category.name || typeof category.name !== 'string' || category.name.trim() === '') {
    throw new ValidationError('Tên danh mục không được để trống', 'name');
  }

  if (category.name.trim().length > 50) {
    throw new ValidationError('Tên danh mục không được vượt quá 50 ký tự', 'name');
  }

  if (category.type !== 'expense' && category.type !== 'income') {
    throw new ValidationError('Loại danh mục phải là "expense" hoặc "income"', 'type');
  }

  if (!category.icon || typeof category.icon !== 'string') {
    throw new ValidationError('Biểu tượng danh mục không hợp lệ', 'icon');
  }

  if (!category.color || typeof category.color !== 'string') {
    throw new ValidationError('Màu sắc danh mục không hợp lệ', 'color');
  }
}

/**
 * Validates that a category's name is unique among active categories of the same type (PDR-023).
 */
export function validateCategoryUniqueness(category: Category, allCategories: Category[]): void {
  const normalizedName = category.name.trim().toLowerCase();
  const isDuplicate = allCategories.some(
    (c) =>
      c.id !== category.id &&
      c.type === category.type &&
      !c.isArchived &&
      c.name.trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    throw new ValidationError(
      `Tên danh mục "${category.name.trim()}" đã tồn tại trong nhóm ${category.type === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}`,
      'name'
    );
  }
}

/**
 * Validates a fund against domain invariants (PDR-008..015).
 */
export function validateFund(fund: import('../types').Fund, activeFunds?: import('../types').Fund[]): void {
  if (!fund.id || typeof fund.id !== 'string' || fund.id.trim() === '') {
    throw new ValidationError('Mã Quỹ (id) không hợp lệ', 'id');
  }

  if (!fund.name || typeof fund.name !== 'string' || fund.name.trim() === '') {
    throw new ValidationError('Tên Quỹ không được để trống', 'name');
  }

  if (fund.name.trim().length > 50) {
    throw new ValidationError('Tên Quỹ không được vượt quá 50 ký tự', 'name');
  }

  if (!fund.icon || typeof fund.icon !== 'string') {
    throw new ValidationError('Biểu tượng Quỹ không hợp lệ', 'icon');
  }

  if (!fund.color || typeof fund.color !== 'string') {
    throw new ValidationError('Màu sắc Quỹ không hợp lệ', 'color');
  }

  if (typeof fund.isArchived !== 'boolean') {
    throw new ValidationError('Trạng thái lưu trữ (isArchived) không hợp lệ', 'isArchived');
  }

  if (!Number.isInteger(fund.order) || fund.order < 0) {
    throw new ValidationError('Thứ tự hiển thị (order) phải là số nguyên không âm', 'order');
  }

  if (!isValidBudgetAmount(fund.defaultBudget)) {
    throw new ValidationError('Hạn mức mặc định phải là số nguyên không âm (>= 0)', 'defaultBudget');
  }

  if (fund.defaultMode !== 'rollover' && fund.defaultMode !== 'reset') {
    throw new ValidationError('Chế độ ngân sách mặc định phải là "rollover" hoặc "reset"', 'defaultMode');
  }

  // Capacity limit: Max 10 active funds (PDR-009, R-CAP-01)
  if (!fund.isArchived && activeFunds) {
    const isNew = !activeFunds.some((f) => f.id === fund.id);
    const currentActiveCount = activeFunds.filter((f) => !f.isArchived).length;
    if (isNew && currentActiveCount >= 10) {
      throw new ValidationError('Đã đạt giới hạn tối đa 10 Quỹ đang hoạt động. Vui lòng ẩn bớt Quỹ không dùng.', 'capacity');
    }

    // Name uniqueness among active funds (PDR-015, R-NAME-01)
    const normalizedName = fund.name.trim().toLowerCase();
    const hasDuplicate = activeFunds.some(
      (f) => f.id !== fund.id && !f.isArchived && f.name.trim().toLowerCase() === normalizedName
    );
    if (hasDuplicate) {
      throw new ValidationError('Tên Quỹ đã tồn tại trong danh sách Quỹ đang hoạt động', 'name');
    }
  }
}

/**
 * Validates a monthly budget config (PDR-018).
 */
export function validateFundMonthlyConfig(config: import('../types').FundMonthlyConfig): void {
  if (!config.id || typeof config.id !== 'string' || config.id.trim() === '') {
    throw new ValidationError('Mã cấu hình (id) không hợp lệ', 'id');
  }

  if (!config.fundId || typeof config.fundId !== 'string' || config.fundId.trim() === '') {
    throw new ValidationError('Mã Quỹ (fundId) không hợp lệ', 'fundId');
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(config.yearMonth)) {
    throw new ValidationError('Tháng cấu hình (yearMonth) phải có định dạng YYYY-MM hợp lệ', 'yearMonth');
  }

  if (config.id !== `${config.fundId}_${config.yearMonth}`) {
    throw new ValidationError('Mã cấu hình phải khớp cú pháp ${fundId}_${yearMonth}', 'id');
  }

  if (!isValidBudgetAmount(config.monthlyBudget)) {
    throw new ValidationError('Hạn mức ngân sách tháng phải là số nguyên không âm (>= 0)', 'monthlyBudget');
  }

  if (config.budgetMode !== 'rollover' && config.budgetMode !== 'reset') {
    throw new ValidationError('Chế độ ngân sách phải là "rollover" hoặc "reset"', 'budgetMode');
  }
}
