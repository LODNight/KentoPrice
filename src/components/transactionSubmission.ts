import type { TransactionType } from '../types';

export interface SubmitTransactionParams {
  amountStr: string;
  categoryId: string;
  type: TransactionType;
  transactionDate: string;
  note: string;
  fundId?: string | null;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  setErrorMsg: (msg: string | null) => void;
  onSave: (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    transactionDate: string;
    note?: string;
    fundId?: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

/**
 * Handles async transaction form submission with duplicate-click protection,
 * non-swallowed error propagation, form preservation on failure, and deterministic state reset.
 */
export async function submitTransactionForm(params: SubmitTransactionParams): Promise<boolean> {
  // Prevent duplicate submissions
  if (params.isSubmitting) {
    return false;
  }

  const digits = params.amountStr.replace(/\D/g, '');
  if (!digits) {
    params.setErrorMsg('Vui lòng nhập số tiền');
    return false;
  }

  const parsedAmount = parseInt(digits, 10);
  if (!parsedAmount || parsedAmount <= 0) {
    params.setErrorMsg('Số tiền phải là số nguyên dương lớn hơn 0');
    return false;
  }

  if (!params.categoryId) {
    params.setErrorMsg('Vui lòng chọn danh mục');
    return false;
  }

  try {
    params.setIsSubmitting(true);
    params.setErrorMsg(null);

    await params.onSave({
      type: params.type,
      amount: parsedAmount,
      categoryId: params.categoryId,
      transactionDate: params.transactionDate,
      note: params.note.trim() || undefined,
      fundId: params.fundId || undefined,
    });

    params.onClose();
    return true;
  } catch (err: unknown) {
    if (err instanceof Error) {
      params.setErrorMsg(err.message || 'Lưu giao dịch thất bại. Vui lòng thử lại.');
    } else {
      params.setErrorMsg('Lưu giao dịch thất bại. Vui lòng thử lại.');
    }
    return false;
  } finally {
    params.setIsSubmitting(false);
  }
}
