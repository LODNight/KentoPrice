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

  it('7. should handle non-Error rejection with friendly fallback message and not crash', async () => {
    const setErrorMsg = vi.fn();
    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValue('Unknown network glitch string');

    const params = createBaseParams({
      onSave,
      onClose,
      setErrorMsg,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(setErrorMsg).toHaveBeenCalledWith('Lưu giao dịch thất bại. Vui lòng thử lại.');
  });

  it('8. should trim whitespace notes and pass undefined when note is empty or only whitespace', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const params = createBaseParams({
      note: '   Ăn trưa văn phòng   ',
      onSave,
    });

    const result = await submitTransactionForm(params);
    expect(result).toBe(true);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'Ăn trưa văn phòng',
      })
    );

    const paramsEmptyNote = createBaseParams({
      note: '     ',
      onSave,
    });

    await submitTransactionForm(paramsEmptyNote);
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        note: undefined,
      })
    );
  });

  it('9. should correctly handle editing flow for an income transaction with fundId null', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const params = createBaseParams({
      type: 'income',
      amountStr: '25.000.000',
      categoryId: 'cat_salary',
      fundId: null,
      transactionDate: '2026-10-01',
      note: 'Lương tháng 10',
      onSave,
      onClose,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(true);
    expect(onSave).toHaveBeenCalledWith({
      type: 'income',
      amount: 25000000,
      categoryId: 'cat_salary',
      transactionDate: '2026-10-01',
      note: 'Lương tháng 10',
      fundId: undefined,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('10. should propagate repository-level IndexedDB error without swallowing, keep modal open and release loading', async () => {
    const isSubmittingStates: boolean[] = [];
    const setIsSubmitting = vi.fn((val: boolean) => isSubmittingStates.push(val));
    const setErrorMsg = vi.fn();
    const onClose = vi.fn();

    // Simulate repository create rejecting due to IndexedDB quota or transaction failure
    const mockRepoCreate = vi.fn().mockRejectedValue(new Error('QuotaExceededError: Dung lượng IndexedDB đã đầy'));
    const simulatedHookSave = async (data: unknown) => {
      await mockRepoCreate(data);
    };

    const params = createBaseParams({
      amountStr: '2.500.000',
      categoryId: 'cat_electronics',
      onSave: vi.fn().mockImplementation(simulatedHookSave),
      onClose,
      setIsSubmitting,
      setErrorMsg,
    });

    const result = await submitTransactionForm(params);

    // Assert: Must return false, error not swallowed, modal remains open
    expect(result).toBe(false);
    expect(mockRepoCreate).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(setErrorMsg).toHaveBeenCalledWith('QuotaExceededError: Dung lượng IndexedDB đã đầy');
    expect(isSubmittingStates).toEqual([true, false]); // Guaranteed loading release
  });

  it('11. should handle editing/update transaction repository failure without closing modal', async () => {
    const setErrorMsg = vi.fn();
    const onClose = vi.fn();
    const mockRepoUpdate = vi.fn().mockRejectedValue(new Error('ConstraintError: Transaction locked or aborted'));

    const params = createBaseParams({
      amountStr: '990.000',
      categoryId: 'cat_dining',
      onSave: vi.fn().mockImplementation(async (data) => {
        await mockRepoUpdate(data);
      }),
      onClose,
      setErrorMsg,
    });

    const result = await submitTransactionForm(params);

    expect(result).toBe(false);
    expect(mockRepoUpdate).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(setErrorMsg).toHaveBeenCalledWith('ConstraintError: Transaction locked or aborted');
  });

  it('12. should block rapid concurrent submissions and guarantee only one save reaches repository', async () => {
    let activeSubmitting = false;
    const isSubmittingStates: boolean[] = [];
    const setIsSubmitting = vi.fn((val: boolean) => {
      activeSubmitting = val;
      isSubmittingStates.push(val);
    });
    const onSave = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const params1 = createBaseParams({
      isSubmitting: activeSubmitting,
      setIsSubmitting,
      onSave,
    });

    // Start first submission
    const firstPromise = submitTransactionForm(params1);

    // Immediately simulate second rapid click while first is still pending
    const params2 = createBaseParams({
      isSubmitting: activeSubmitting, // now true
      setIsSubmitting,
      onSave,
    });
    const secondResult = await submitTransactionForm(params2);

    // Second click must be immediately rejected with false
    expect(secondResult).toBe(false);

    // Wait for first submission to complete
    const firstResult = await firstPromise;
    expect(firstResult).toBe(true);

    // onSave should only have been called exactly once
    expect(onSave).toHaveBeenCalledOnce();
  });
});

