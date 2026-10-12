import React, { useState, useEffect, useMemo } from 'react';
import type { Fund, BudgetMode, FundMonthlySummary } from '../types';
import { IconRenderer } from './IconRenderer';
import { formatVND, formatNumberWithDots } from '../utils/currency';
import { X, Check, Archive, AlertTriangle, Sparkles, RotateCcw, RefreshCw } from 'lucide-react';

const AVAILABLE_ICONS = [
  'wallet',
  'utensils',
  'coffee',
  'shoppingbag',
  'car',
  'home',
  'briefcase',
  'graduationcap',
  'heart',
  'piggybank',
  'creditcard',
  'smile',
  'plane',
  'book',
];

const AVAILABLE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#64748B', // Slate
];

const BUDGET_PRESETS = [0, 1000000, 2000000, 3000000, 5000000, 10000000];

interface FundFormModalProps {
  isOpen: boolean;
  fund: Fund | null; // null if creating, Fund if editing
  activeFunds: Fund[];
  existingSummary?: FundMonthlySummary | null;
  onSave: (data: {
    name: string;
    icon: string;
    color: string;
    budget: number;
    mode: BudgetMode;
  }) => Promise<void>;
  onArchiveRequest?: (fund: Fund) => void;
  onClose: () => void;
}

export const FundFormModal: React.FC<FundFormModalProps> = ({
  isOpen,
  fund,
  activeFunds,
  existingSummary,
  onSave,
  onArchiveRequest,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState('#3B82F6');
  const [rawBudget, setRawBudget] = useState('5000000');
  const [mode, setMode] = useState<BudgetMode>('rollover');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Initial populate
  useEffect(() => {
    if (fund) {
      setName(fund.name);
      setIcon(fund.icon || 'wallet');
      setColor(fund.color || '#3B82F6');
      setRawBudget(String(existingSummary?.monthlyBudget ?? fund.defaultBudget));
      setMode(existingSummary?.budgetMode ?? fund.defaultMode);
    } else {
      setName('');
      setIcon('wallet');
      setColor('#3B82F6');
      setRawBudget('5000000');
      setMode('rollover');
    }
    setNameError(null);
  }, [fund, existingSummary, isOpen]);

  // Real-time name uniqueness validation (PDR-015, R-NAME-01)
  const validateName = (inputName: string): boolean => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setNameError('Tên Quỹ không được để trống');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Tên Quỹ không được vượt quá 50 ký tự');
      return false;
    }

    const normalized = trimmed.toLowerCase();
    const isDuplicate = activeFunds.some(
      (f) => f.id !== fund?.id && !f.isArchived && f.name.trim().toLowerCase() === normalized
    );

    if (isDuplicate) {
      setNameError('Tên Quỹ đã tồn tại trong danh sách Quỹ đang hoạt động');
      return false;
    }

    setNameError(null);
    return true;
  };

  const numericBudget = useMemo(() => {
    const digits = rawBudget.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }, [rawBudget]);

  // Live impact calculation (PDR-012, Wireframe 3)
  const effectiveOpening = useMemo(() => {
    const opening = existingSummary?.openingBalance ?? 0;
    return mode === 'rollover' ? opening : 0;
  }, [existingSummary, mode]);

  const liveProjectedBalance = useMemo(() => {
    const spending = existingSummary?.monthlySpending ?? 0;
    return effectiveOpening + numericBudget - spending;
  }, [effectiveOpening, numericBudget, existingSummary]);

  if (!isOpen) return null;

  const isDirty = fund
    ? name !== fund.name ||
      icon !== fund.icon ||
      color !== fund.color ||
      numericBudget !== (existingSummary?.monthlyBudget ?? fund.defaultBudget) ||
      mode !== (existingSummary?.budgetMode ?? fund.defaultMode)
    : name.trim() !== '' || numericBudget !== 5000000;

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Hủy bỏ thao tác? Các thay đổi vừa nhập sẽ không được lưu.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        budget: numericBudget,
        mode,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu Quỹ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-sheet"
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fund-modal-title"
      >
        {/* Mobile Drag Indicator */}
        <div className="sheet-handle" />

        {/* Modal Header (Pinned at top) */}
        <div className="sheet-header" style={{ padding: '12px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: `${color}20`,
                color: color,
                border: `1.5px solid ${color}45`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 8px ${color}25`,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <IconRenderer name={icon} size={20} />
            </div>
            <div>
              <h2 id="fund-modal-title" className="sheet-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                {fund ? 'Chi Tiết & Chỉnh Sửa Quỹ' : 'Thêm Quỹ Mới'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {fund ? `Cập nhật thông tin quỹ ${fund.name}` : 'Phân bổ hạn mức chi tiêu mục đích'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-sheet"
            onClick={handleClose}
            aria-label="Đóng"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wrapping scrollable body and pinned footer */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Modal Form Scrollable Body */}
          <div
            className="sheet-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 1. Tên Quỹ */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Tên Quỹ <span style={{ color: 'var(--color-expense)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {name.trim().length}/50
                </span>
              </div>
              <input
                type="text"
                className="text-input"
                value={name}
                placeholder="ví dụ: Quỹ Ăn Uống, Quỹ Xăng Xe, Tiết Kiệm..."
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) validateName(e.target.value);
                }}
                onBlur={() => validateName(name)}
                style={{
                  borderColor: nameError ? 'var(--color-expense)' : undefined,
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '0.875rem',
                }}
                autoFocus={!fund}
              />
              {nameError && (
                <div style={{ color: 'var(--color-expense)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} />
                  <span>{nameError}</span>
                </div>
              )}
            </div>

            {/* 2. Biểu tượng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Biểu tượng nhận diện
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                }}
              >
                {AVAILABLE_ICONS.map((ic) => {
                  const isSelected = icon === ic;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      style={{
                        height: '36px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${color}` : '1px solid var(--color-border-subtle)',
                        backgroundColor: isSelected ? `${color}25` : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? color : 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        transform: isSelected ? 'scale(1.04)' : 'none',
                      }}
                      title={ic}
                    >
                      <IconRenderer name={ic} size={17} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Màu sắc hiển thị */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Màu sắc chủ đạo
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AVAILABLE_COLORS.map((c) => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: isSelected ? '2.5px solid #FFFFFF' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? `0 0 8px ${c}` : undefined,
                        transform: isSelected ? 'scale(1.12)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={c}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Hạn mức ngân sách tháng */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Hạn mức ngân sách tháng
                </label>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#60A5FA',
                  }}
                >
                  Cho phép 0 ₫ (PDR-011)
                </span>
              </div>

              <div style={{ position: 'relative', marginBottom: '6px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="text-input"
                  value={formatNumberWithDots(rawBudget)}
                  onChange={(e) => setRawBudget(e.target.value)}
                  placeholder="0"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    paddingRight: '36px',
                    width: '100%',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  ₫
                </span>
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {BUDGET_PRESETS.map((preset) => {
                  const isActive = numericBudget === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRawBudget(String(preset))}
                      style={{
                        fontSize: '0.71875rem',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        border: isActive ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border-subtle)',
                        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                        color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: isActive ? 600 : 400,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {preset === 0 ? '0 ₫' : formatVND(preset)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Chế độ ngân sách chuyển tháng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Chế độ ngân sách chuyển tháng
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* Option 1: Rollover */}
                <button
                  type="button"
                  onClick={() => setMode('rollover')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: mode === 'rollover' ? '2px solid #3B82F6' : '1px solid var(--color-border-subtle)',
                    backgroundColor: mode === 'rollover' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8125rem' }}>
                      <RotateCcw size={14} style={{ color: '#3B82F6' }} />
                      <span>Cộng dồn</span>
                    </div>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: mode === 'rollover' ? '3.5px solid #3B82F6' : '1.5px solid var(--color-border-subtle)',
                        backgroundColor: mode === 'rollover' ? '#FFFFFF' : 'transparent',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    Kế thừa số dư cuối kỳ tháng trước sang tháng sau.
                  </div>
                </button>

                {/* Option 2: Reset */}
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: mode === 'reset' ? '2px solid #3B82F6' : '1px solid var(--color-border-subtle)',
                    backgroundColor: mode === 'reset' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8125rem' }}>
                      <RefreshCw size={14} style={{ color: '#3B82F6' }} />
                      <span>Đặt lại</span>
                    </div>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: mode === 'reset' ? '3.5px solid #3B82F6' : '1.5px solid var(--color-border-subtle)',
                        backgroundColor: mode === 'reset' ? '#FFFFFF' : 'transparent',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    Bắt đầu tháng mới từ 0 ₫, bỏ qua số dư cũ.
                  </div>
                </button>
              </div>
            </div>

            {/* 6. Thẻ Xem trước tác động */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#60A5FA', fontWeight: 600, marginBottom: '6px' }}>
                <Sparkles size={13} />
                <span>Xem trước tác động tháng này:</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78125rem', marginBottom: '3px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Ngân sách cấp tháng:</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(numericBudget)}</span>
              </div>

              {effectiveOpening !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78125rem', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Số dư chuyển tiếp (Opening):</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: effectiveOpening < 0 ? 'var(--color-expense)' : 'var(--color-income)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {effectiveOpening > 0 ? `+${formatVND(effectiveOpening)}` : formatVND(effectiveOpening)}
                  </span>
                </div>
              )}

              {existingSummary && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78125rem', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Đã chi trong tháng:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-expense)', fontVariantNumeric: 'tabular-nums' }}>
                    -{formatVND(existingSummary.monthlySpending)}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: '0.845rem',
                  paddingTop: '6px',
                  marginTop: '3px',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Số dư khả dụng:</span>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: liveProjectedBalance < 0 ? 'var(--color-expense)' : 'var(--color-income)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatVND(liveProjectedBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Pinned Modal Footer (Always visible without scrolling!) */}
          <div
            className="sheet-footer"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              backgroundColor: 'var(--color-surface-card)',
              flexShrink: 0,
            }}
          >
            {fund && onArchiveRequest ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: 'var(--color-expense)', borderColor: 'rgba(239, 68, 68, 0.3)', gap: '6px' }}
                onClick={() => onArchiveRequest(fund)}
              >
                <Archive size={14} />
                <span>Ẩn Quỹ</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !!nameError}
              >
                {isSubmitting ? 'Đang lưu...' : fund ? 'Lưu thay đổi' : 'Tạo Quỹ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
