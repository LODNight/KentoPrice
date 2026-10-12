import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-expense-bg)',
            color: 'var(--color-expense)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <AlertCircle size={24} />
        </div>

        <h3 id="delete-dialog-title" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>
          Xác nhận xóa giao dịch?
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Thao tác này sẽ xóa bản ghi khỏi sổ chi tiêu và không thể khôi phục.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-expense"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <Trash2 size={16} /> Xóa Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
