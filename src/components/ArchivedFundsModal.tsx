import React, { useState } from 'react';
import type { Fund } from '../types';
import { IconRenderer } from './IconRenderer';
import { formatVND } from '../utils/currency';
import { X, RotateCcw, AlertTriangle, Archive } from 'lucide-react';

interface ArchivedFundsModalProps {
  isOpen: boolean;
  archivedFunds: Fund[];
  activeCount: number;
  onRestore: (id: string) => Promise<void>;
  onClose: () => void;
}

export const ArchivedFundsModal: React.FC<ArchivedFundsModalProps> = ({
  isOpen,
  archivedFunds,
  activeCount,
  onRestore,
  onClose,
}) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCapacityFull = activeCount >= 10;

  const handleRestore = async (id: string) => {
    if (isCapacityFull) {
      setErrorMessage('Đã đạt giới hạn tối đa 10 Quỹ đang hoạt động. Vui lòng ẩn bớt một Quỹ khác trước khi khôi phục.');
      return;
    }
    setRestoringId(id);
    setErrorMessage(null);
    try {
      await onRestore(id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi khôi phục Quỹ');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '520px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archived-funds-title"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Archive size={18} />
            </div>
            <div>
              <h3 id="archived-funds-title" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Quỹ Đã Ẩn (Lưu Trữ)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {archivedFunds.length} Quỹ lưu trữ • {activeCount}/10 Quỹ đang hoạt động
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Đóng"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-expense)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {isCapacityFull && !errorMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--color-warning, #F59E0B)',
              fontSize: '0.75rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>Đã dùng tối đa 10/10 Quỹ active. Hãy ẩn bớt một Quỹ để có thể khôi phục thêm.</span>
          </div>
        )}

        <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {archivedFunds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Không có Quỹ nào trong danh sách đã ẩn.
            </div>
          ) : (
            archivedFunds.map((fund) => (
              <div
                key={fund.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: `${fund.color}22`,
                      color: fund.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconRenderer name={fund.icon} size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {fund.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Mặc định: {formatVND(fund.defaultBudget)} • {fund.defaultMode === 'rollover' ? 'Cộng dồn' : 'Đặt lại'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    gap: '6px',
                    opacity: isCapacityFull ? 0.6 : 1,
                  }}
                  disabled={restoringId === fund.id}
                  onClick={() => handleRestore(fund.id)}
                  title={isCapacityFull ? 'Đã đạt giới hạn 10 Quỹ' : 'Khôi phục Quỹ'}
                >
                  <RotateCcw size={14} />
                  {restoringId === fund.id ? 'Đang khôi phục...' : 'Khôi phục'}
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
