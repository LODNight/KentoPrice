import { describe, it, expect, vi } from 'vitest';
import { submitTransactionForm, type SubmitTransactionParams } from './transactionSubmission';

describe('Transaction Submission Controller (Async Save & Error Handling)', () => {
  const createBaseParams = (overrides?: Partial<SubmitTransactionParams>): SubmitTransactionParams => ({
    amountStr: '150.000',
    categoryId: 'cat_dining',
    type: 'expense',
    transactionDate: '2026-10-10',
    note: 'Cà phê',
    fundId: 'fund_living',
    isSubmitting: false,
    setIsSubmitting: vi.fn(),
    setErrorMsg: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  });

  it('1. should succeed: await onSave, call onClose, and reset isSubmitting in finally', async () => {
    const isSubmittingStates: boolean[] = [];
    const setIsSubmitting = vi.fn((val: boolean) => isSubmittingStates.push(val));
    const onClose = vi.fn();
    const onSave = vi.fn().mockImplementation(async () => {
      // Simulate network / async delay
      await new Promise((r) => setTimeout(r, 10));
    });

    const params = createBaseParams({
      onSave,
      onClose,
      setIsSubmitting,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(true);
    expect(onSave).toHaveBeenCalledWith({
      type: 'expense',
      amount: 150000,
      categoryId: 'cat_dining',
      transactionDate: '2026-10-10',
      note: 'Cà phê',
      fundId: 'fund_living',
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(isSubmittingStates).toEqual([true, false]);
  });

  it('2. should handle failure: do NOT call onClose, set clear errorMsg, and restore isSubmitting', async () => {
    const isSubmittingStates: boolean[] = [];
    const setIsSubmitting = vi.fn((val: boolean) => isSubmittingStates.push(val));
    const setErrorMsg = vi.fn();
    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValue(new Error('Mạng bị ngắt kết nối. Lưu thất bại.'));

    const params = createBaseParams({
      onSave,
      onClose,
      setIsSubmitting,
      setErrorMsg,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled(); // Form is kept open!
    expect(setErrorMsg).toHaveBeenCalledWith('Mạng bị ngắt kết nối. Lưu thất bại.');
    expect(isSubmittingStates).toEqual([true, false]); // Restores isSubmitting deterministically
  });

  it('3. should block duplicate submit when isSubmitting is true', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const params = createBaseParams({
      isSubmitting: true, // Already submitting
      onSave,
      onClose,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('4. should validate empty amount and show clear error without calling onSave', async () => {
    const setErrorMsg = vi.fn();
    const onSave = vi.fn();

    const params = createBaseParams({
      amountStr: '',
      setErrorMsg,
      onSave,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(setErrorMsg).toHaveBeenCalledWith('Vui lòng nhập số tiền');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('5. should validate zero amount and show clear error without calling onSave', async () => {
    const setErrorMsg = vi.fn();
    const onSave = vi.fn();

    const params = createBaseParams({
      amountStr: '0',
      setErrorMsg,
      onSave,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(setErrorMsg).toHaveBeenCalledWith('Số tiền phải là số nguyên dương lớn hơn 0');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('6. should validate missing category and show clear error without calling onSave', async () => {
    const setErrorMsg = vi.fn();
    const onSave = vi.fn();

    const params = createBaseParams({
      categoryId: '',
      setErrorMsg,
      onSave,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(setErrorMsg).toHaveBeenCalledWith('Vui lòng chọn danh mục');
    expect(onSave).not.toHaveBeenCalled();
  });
});
