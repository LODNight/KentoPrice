import { Archive } from 'lucide-react';

interface ArchiveFundModalProps {
  isOpen: boolean;
  fundName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ArchiveFundModal: React.FC<ArchiveFundModalProps> = ({
  isOpen,
  fundName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '440px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-modal-title"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-expense)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Archive size={24} />
          </div>
          <h3 id="archive-modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Xác nhận Ẩn Quỹ
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Bạn có chắc chắn muốn ẩn <strong style={{ color: 'var(--color-text-primary)' }}>"{fundName}"</strong>?
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-income)', fontWeight: 600 }}>✓</span>
            <span>Toàn bộ giao dịch và báo cáo lịch sử của Quỹ vẫn được <strong>bảo toàn 100%</strong>.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-income)', fontWeight: 600 }}>✓</span>
            <span>Các giao dịch cũ vẫn hiển thị tên Quỹ kèm nhãn <em>(Đã ẩn)</em>.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>•</span>
            <span>Quỹ sẽ không xuất hiện khi bạn ghi nhận giao dịch mới và có thể khôi phục lại bất kỳ lúc nào.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
            Giữ lại
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            style={{ flex: 1.5 }}
          >
            Ẩn Quỹ ngay
          </button>
        </div>
      </div>
    </div>
  );
};
