import React from 'react';
import type { BudgetMode } from '../types';
import { formatVND } from '../utils/currency';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface ModeChangeModalProps {
  isOpen: boolean;
  fundName: string;
  currentMode: BudgetMode;
  targetMode: BudgetMode;
  currentBalance: number;
  projectedBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ModeChangeModal: React.FC<ModeChangeModalProps> = ({
  isOpen,
  fundName,
  currentMode,
  targetMode,
  currentBalance,
  projectedBalance,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const diff = projectedBalance - currentBalance;
  const isRolloverToReset = currentMode === 'rollover' && targetMode === 'reset';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '460px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-change-title"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--color-warning, #F59E0B)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <h3 id="mode-change-title" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Xác nhận đổi Chế độ Ngân sách
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Quỹ: <strong style={{ color: 'var(--color-text-primary)' }}>{fundName}</strong>
          </p>
        </div>

        {/* Before / After Diff (PDR-014 & Wireframe 4) */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Chế độ:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600 }}>
              <span>{currentMode === 'rollover' ? 'Cộng dồn' : 'Đặt lại'}</span>
              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ color: 'var(--color-brand-primary)' }}>
                {targetMode === 'rollover' ? 'Cộng dồn' : 'Đặt lại'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Số dư trước:</span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatVND(currentBalance)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Chênh lệch:</span>
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: diff > 0 ? 'var(--color-income)' : diff < 0 ? 'var(--color-expense)' : 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {diff > 0 ? `+${formatVND(diff)}` : diff < 0 ? `-${formatVND(Math.abs(diff))}` : '0 ₫'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Số dư sau áp dụng:</span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: projectedBalance < 0 ? 'var(--color-expense)' : 'var(--color-income)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatVND(projectedBalance)}
            </span>
          </div>

          <div
            style={{
              paddingTop: '8px',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
            }}
          >
            {isRolloverToReset ? (
              <span>
                ℹ️ Chuyển sang <strong>Đặt lại</strong> sẽ bỏ qua số dư chuyển tiếp từ tháng trước cho tháng này (Opening Balance = 0 ₫). Lịch sử các tháng cũ vẫn được bảo toàn.
              </span>
            ) : (
              <span>
                ℹ️ Chuyển sang <strong>Cộng dồn</strong> sẽ kế thừa số dư kết thúc từ tháng trước vào tháng này.
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ flex: 1.5 }}
          >
            Xác nhận áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
