import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';
import { formatVND } from '../utils/currency';
import { formatDateVN, formatMonthYear } from '../utils/date';

export interface CascadeWarningModalProps {
  isOpen: boolean;
  isMonthShift: boolean; // True: Wireframe 9 (chuyển kỳ giữa các tháng), False: Wireframe 8 (sửa số tiền trong tháng cũ)
  fundName: string;
  transactionNote?: string;
  categoryName?: string;
  oldAmount: number;
  newAmount: number;
  oldDate: string;
  newDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CascadeWarningModal: React.FC<CascadeWarningModalProps> = ({
  isOpen,
  isMonthShift,
  fundName,
  transactionNote,
  categoryName,
  oldAmount,
  newAmount,
  oldDate,
  newDate,
  onConfirm,
  onCancel,
}) => {
  // Keyboard accessibility: Escape key to cancel/close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const [oldY, oldM] = oldDate.split('-').map(Number);
  const [newY, newM] = newDate.split('-').map(Number);
  const oldMonthLabel = formatMonthYear(oldY, oldM);
  const newMonthLabel = formatMonthYear(newY, newM);
  const amountDiff = newAmount - oldAmount;

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 1100 }}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '480px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-modal-title"
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={26} strokeWidth={2.2} />
          </div>
          <h3
            id="cascade-modal-title"
            style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)' }}
          >
            {isMonthShift ? 'Cảnh Báo Chuyển Kỳ Ngân Sách Quỹ' : 'Cảnh Báo Sửa Giao Dịch Tháng Lịch Sử'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Giao dịch liên kết với Quỹ <strong style={{ color: 'var(--color-primary)' }}>"{fundName}"</strong>
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Mục / Ghi chú:</span>
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {transactionNote || categoryName || 'Giao dịch'}
            </span>
          </div>

          {/* Amount change comparison */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Số tiền:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ textDecoration: oldAmount !== newAmount ? 'line-through' : 'none', color: 'var(--color-text-muted)' }}>
                {formatVND(oldAmount)}
              </span>
              {oldAmount !== newAmount && (
                <>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatVND(newAmount)}</span>
                </>
              )}
            </div>
          </div>

          {/* Date / Month change comparison */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Ngày giao dịch:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ textDecoration: isMonthShift ? 'line-through' : 'none', color: 'var(--color-text-muted)' }}>
                {formatDateVN(oldDate)}
              </span>
              {isMonthShift && (
                <>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {formatDateVN(newDate)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Impact Explanation Box (Wireframe 8 & 9) */}
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            fontSize: '0.8125rem',
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} />
            <span>Phạm vi ảnh hưởng số dư (PDR-019 & PDR-022):</span>
          </div>

          {isMonthShift ? (
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-secondary)' }}>
              <li>
                <strong>{oldMonthLabel}:</strong> Giảm chi tiêu {formatVND(oldAmount)} ➔ Số dư cuối kỳ tăng tương ứng.
              </li>
              <li>
                <strong>{newMonthLabel}:</strong> Tăng chi tiêu {formatVND(newAmount)} ➔ Số dư kỳ này giảm tương ứng.
              </li>
              <li>
                Các tháng tiếp theo dùng chế độ <em>Cộng dồn (Rollover)</em> sẽ tự động tính lại số dư dây chuyền.
              </li>
            </ul>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-secondary)' }}>
              <li>
                <strong>{oldMonthLabel}:</strong> Chi tiêu thay đổi {amountDiff > 0 ? `+${formatVND(amountDiff)}` : formatVND(amountDiff)}.
              </li>
              <li>
                Số dư chuyển tiếp sang các tháng kế tiếp sẽ tự động cập nhật dây chuyền cho đến tháng dùng <em>Đặt lại (Reset)</em>.
              </li>
            </ul>
          )}
        </div>

        {/* Immutable Guarantee Safeguard Box */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '0.75rem',
            color: 'var(--color-income)',
            marginBottom: '20px',
            lineHeight: 1.45,
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong>Bảo toàn cấu hình lịch sử (PDR-013):</strong> Ngân sách (Budget) và Chế độ lịch sử của các tháng đã qua tuyệt đối không bị thay đổi.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{ flex: 1, padding: '10px 16px' }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{ flex: 1.3, padding: '10px 16px', backgroundColor: '#F59E0B', borderColor: '#F59E0B' }}
          >
            {isMonthShift ? 'Tiếp tục chuyển' : 'Xác nhận cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
};
