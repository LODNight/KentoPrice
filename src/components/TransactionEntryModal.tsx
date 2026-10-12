import React, { useState, useEffect, useRef } from 'react';
import type { Category, Transaction, TransactionType, Fund } from '../types';
import { IconRenderer } from './IconRenderer';
import { formatNumberWithDots, numberToVietnameseWords } from '../utils/currency';
import { getLocalTodayDateString } from '../utils/date';
import { X, Check, ArrowDownLeft, ArrowUpRight, Briefcase, Plus, Loader2 } from 'lucide-react';
import { CategoryFormModal } from './CategoryFormModal';
import { submitTransactionForm } from './transactionSubmission';

interface TransactionEntryModalProps {
  isOpen: boolean;
  initialType: TransactionType;
  editingTransaction?: Transaction | null;
  categories: Category[];
  activeFunds?: Fund[];
  allFunds?: Fund[];
  onClose: () => void;
  onSave: (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    transactionDate: string;
    note?: string;
    fundId?: string | null;
  }) => Promise<void> | void;
  onCreateCategory?: (data: {
    name: string;
    type: TransactionType;
    icon: string;
    color: string;
  }) => Promise<Category>;
}

export const TransactionEntryModal: React.FC<TransactionEntryModalProps> = ({
  isOpen,
  initialType,
  editingTransaction,
  categories,
  activeFunds = [],
  allFunds = [],
  onClose,
  onSave,
  onCreateCategory,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [fundId, setFundId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>(getLocalTodayDateString());
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isQuickAddCatOpen, setIsQuickAddCatOpen] = useState<boolean>(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form state when opened or editingTransaction changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(formatNumberWithDots(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setFundId(editingTransaction.fundId || null);
      setTransactionDate(editingTransaction.transactionDate);
      setNote(editingTransaction.note || '');
    } else {
      setType(initialType);
      setAmountStr('');
      setFundId(null);
      setTransactionDate(getLocalTodayDateString());
      setNote('');

      // Auto-select first active category for the type
      const activeCats = categories.filter((c) => c.type === initialType && !c.isArchived);
      if (activeCats.length > 0) {
        setCategoryId(activeCats[0].id);
      } else {
        setCategoryId('');
      }
    }
    setErrorMsg(null);
    setIsSubmitting(false);

    // Autofocus amount input after render
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, initialType, editingTransaction, categories]);

  // When type changes, switch active category if current category does not match type
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setErrorMsg(null);
    const validCats = categories.filter((c) => c.type === newType && !c.isArchived);
    const currentCatValid = validCats.some((c) => c.id === categoryId);
    if (!currentCatValid && validCats.length > 0) {
      setCategoryId(validCats[0].id);
    }
  };

  // Live input handler: auto formats 3 digits with dot (e.g. 120300 -> 120.300)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (!rawValue) {
      setAmountStr('');
      if (errorMsg) setErrorMsg(null);
      return;
    }

    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      setAmountStr('');
      return;
    }

    // Cap at 1 trillion VND to avoid overflow
    if (digitsOnly.length > 12) {
      return;
    }

    const formatted = formatNumberWithDots(digitsOnly);
    setAmountStr(formatted);
    if (errorMsg) setErrorMsg(null);
  };

  // Quick increment chips (+10k, +50k, +100k, +500k)
  const handleQuickAdd = (increment: number) => {
    try {
      const currentDigits = amountStr.replace(/\D/g, '');
      const current = currentDigits ? parseInt(currentDigits, 10) : 0;
      const next = current + increment;
      setAmountStr(formatNumberWithDots(next));
      if (errorMsg) setErrorMsg(null);
    } catch {
      setAmountStr(formatNumberWithDots(increment));
      if (errorMsg) setErrorMsg(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await submitTransactionForm({
      amountStr,
      categoryId,
      type,
      transactionDate,
      note,
      fundId,
      isSubmitting,
      setIsSubmitting,
      setErrorMsg,
      onSave,
      onClose,
    });
  };

  if (!isOpen) return null;

  const numericAmount = amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10) : 0;
  const inputCharCount = amountStr ? amountStr.length : 1;
  const dynamicInputWidth = `${Math.max(1.2, inputCharCount * 1.15)}ch`;

  // Filter available categories: must match transaction type & not archived (or match editing category)
  const availableCategories = categories.filter(
    (c) => c.type === type && (!c.isArchived || c.id === categoryId)
  );

  return (
    <div className="modal-backdrop" onClick={isSubmitting ? undefined : onClose}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-entry-title"
      >
        {/* Mobile Drag Indicator */}
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div className="sheet-header">
          <h2 id="modal-entry-title" className="sheet-title">
            {editingTransaction
              ? 'Sửa Giao Dịch'
              : type === 'expense'
              ? 'Thêm Khoản Chi'
              : 'Thêm Khoản Thu'}
          </h2>
          <button
            className="btn-close-sheet"
            onClick={isSubmitting ? undefined : onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="sheet-body">
          {/* Action 1: Type Switcher (Chi / Thu) */}
          <div className="type-segmented-control" role="group" aria-label="Loại giao dịch">
            <button
              type="button"
              className={`segmented-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              <ArrowDownLeft size={16} />
              Khoản Chi
            </button>
            <button
              type="button"
              className={`segmented-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              <ArrowUpRight size={16} />
              Khoản Thu
            </button>
          </div>

          {/* Action 2: Amount Input with live 3-digit dot formatting and words preview */}
          <div
            className={`amount-input-box ${errorMsg ? 'error' : ''}`}
            onClick={() => amountInputRef.current?.focus()}
          >
            <span className="amount-currency-label">Số tiền (VND)</span>
            
            <div className="amount-display-row">
              <input
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="amount-input-field"
                placeholder="0"
                value={amountStr}
                onChange={handleAmountChange}
                style={{ width: dynamicInputWidth }}
                aria-label="Số tiền giao dịch"
              />
              <span className="amount-unit-suffix">₫</span>
            </div>

            {errorMsg ? (
              <span className="amount-error-msg">{errorMsg}</span>
            ) : (
              <span className={`amount-words-preview ${numericAmount === 0 ? 'empty' : ''}`}>
                {numericAmount > 0
                  ? numberToVietnameseWords(numericAmount)
                  : 'Nhập số tiền hoặc bấm phím tắt bên dưới'}
              </span>
            )}
          </div>

          {/* Fast Quick-add Chips */}
          <div className="quick-add-chips">
            <button
              type="button"
              className="chip-quick-add"
              onClick={() => handleQuickAdd(20_000)}
            >
              +20k
            </button>
            <button
              type="button"
              className="chip-quick-add"
              onClick={() => handleQuickAdd(50_000)}
            >
              +50k
            </button>
            <button
              type="button"
              className="chip-quick-add"
              onClick={() => handleQuickAdd(100_000)}
            >
              +100k
            </button>
            <button
              type="button"
              className="chip-quick-add"
              onClick={() => handleQuickAdd(500_000)}
            >
              +500k
            </button>
            <button
              type="button"
              className="chip-quick-add"
              onClick={() => handleQuickAdd(1_000_000)}
            >
              +1tr
            </button>
          </div>

          {/* Action 3: Category Picker Chips */}
          <div className="category-selection-section">
            <label className="category-section-label">
              Danh mục ({availableCategories.length})
            </label>
            <div className="category-chip-grid" role="radiogroup" aria-label="Chọn danh mục">
              {availableCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`category-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setCategoryId(cat.id);
                      if (errorMsg) setErrorMsg(null);
                    }}
                  >
                    <div
                      className="cat-chip-icon"
                      style={{
                        backgroundColor: isSelected ? cat.color : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#FFFFFF' : cat.color,
                      }}
                    >
                      <IconRenderer name={cat.icon} size={16} />
                    </div>
                    <span className="cat-chip-name">{cat.name}</span>
                  </button>
                );
              })}

              {onCreateCategory && (
                <button
                  type="button"
                  className="category-chip category-chip-add"
                  onClick={() => setIsQuickAddCatOpen(true)}
                  title="Thêm danh mục mới"
                  style={{
                    borderStyle: 'dashed',
                    borderColor: 'var(--color-border-subtle)',
                    opacity: 0.9,
                  }}
                >
                  <div
                    className="cat-chip-icon"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Plus size={16} />
                  </div>
                  <span className="cat-chip-name" style={{ color: 'var(--color-text-secondary)' }}>
                    + Thêm mới
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Action: Fund Picker Chips (Optional 0..1 - PDR-008 & PDR-020) */}
          {(activeFunds.length > 0 || (fundId && allFunds.some((f) => f.id === fundId))) && (
            <div className="category-selection-section" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="category-section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Briefcase size={14} style={{ color: 'var(--color-brand-primary)' }} />
                  <span>Quỹ chi tiêu (Tùy chọn)</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {fundId ? 'Đã gán Quỹ' : 'Chi ngoài Quỹ'}
                </span>
              </div>

              <div className="category-chip-grid" role="radiogroup" aria-label="Chọn Quỹ">
                {/* Option: Không gắn Quỹ */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={!fundId}
                  className={`category-chip ${!fundId ? 'active' : ''}`}
                  onClick={() => setFundId(null)}
                >
                  <div
                    className="cat-chip-icon"
                    style={{
                      backgroundColor: !fundId ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <X size={14} />
                  </div>
                  <span className="cat-chip-name">Không gắn Quỹ</span>
                </button>

                {/* If editing and has an archived fund, show it with (Đã ẩn) (PDR-020) */}
                {fundId &&
                  allFunds.find((f) => f.id === fundId && f.isArchived) && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={true}
                      className="category-chip active"
                      onClick={() => setFundId(fundId)}
                      style={{ opacity: 0.85, borderStyle: 'dashed' }}
                    >
                      <div
                        className="cat-chip-icon"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <Briefcase size={14} />
                      </div>
                      <span className="cat-chip-name">
                        {allFunds.find((f) => f.id === fundId)?.name} <em>(Đã ẩn)</em>
                      </span>
                    </button>
                  )}

                {/* Active Funds */}
                {activeFunds.map((f) => {
                  const isSelected = fundId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`category-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => setFundId(f.id)}
                    >
                      <div
                        className="cat-chip-icon"
                        style={{
                          backgroundColor: isSelected ? f.color : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#FFFFFF' : f.color,
                        }}
                      >
                        <IconRenderer name={f.icon} size={16} />
                      </div>
                      <span className="cat-chip-name">{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auxiliary Fields (Date & Note) */}
          <div className="auxiliary-fields-row">
            <div className="input-group">
              <label htmlFor="txn-date-input" className="input-label">Ngày ghi nhận</label>
              <input
                id="txn-date-input"
                type="date"
                className="text-input"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="txn-note-input" className="input-label">Ghi chú (tùy chọn)</label>
              <input
                id="txn-note-input"
                type="text"
                className="text-input"
                placeholder="VD: Cà phê sáng..."
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </form>

        {/* Action 4: Save Interaction */}
        <div className="sheet-footer">
          <button
            type="button"
            className={`btn btn-submit-txn ${type === 'expense' ? 'btn-expense' : 'btn-income'}`}
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>
                  {editingTransaction
                    ? 'Cập Nhật Giao Dịch'
                    : type === 'expense'
                    ? 'Lưu Khoản Chi'
                    : 'Lưu Khoản Thu'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Category Form Modal */}
      {isQuickAddCatOpen && (
        <CategoryFormModal
          isOpen={isQuickAddCatOpen}
          initialType={type}
          existingCategories={categories}
          onSave={async (data) => {
            if (onCreateCategory) {
              const newCat = await onCreateCategory(data);
              setCategoryId(newCat.id);
              setIsQuickAddCatOpen(false);
            }
          }}
          onClose={() => setIsQuickAddCatOpen(false)}
        />
      )}
    </div>
  );
};
