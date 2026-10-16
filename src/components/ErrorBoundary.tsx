import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { exportAndDownloadBackup } from '../services/backup';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExportingEmergencyBackup: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExportingEmergencyBackup: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isExportingEmergencyBackup: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught runtime UI error:', error, errorInfo);
  }

  handleEmergencyExport = async () => {
    this.setState({ isExportingEmergencyBackup: true });
    try {
      await exportAndDownloadBackup();
    } catch (e) {
      console.error('Failed to export emergency backup:', e);
      alert('Không thể tạo file sao lưu khẩn cấp.');
    } finally {
      this.setState({ isExportingEmergencyBackup: false });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'var(--color-bg, #0B0F19)',
            color: 'var(--color-text-primary, #F8FAFC)',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--color-surface, #151D2F)',
              borderRadius: '16px',
              border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '28px 24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Đã xảy ra sự cố hiển thị
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary, #94A3B8)',
                margin: '0 0 20px 0',
                lineHeight: 1.5,
              }}
            >
              Ứng dụng gặp lỗi không mong muốn. Dữ liệu của bạn trong cơ sở dữ liệu IndexedDB vẫn an toàn.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: 'var(--color-surface-elevated, #1E293B)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#F87171',
                  wordBreak: 'break-all',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-brand-primary, #10B981)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} /> Tải lại trang
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyExport}
                disabled={this.state.isExportingEmergencyBackup}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary, #F8FAFC)',
                  border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.15))',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Download size={16} />
                {this.state.isExportingEmergencyBackup
                  ? 'Đang sao lưu...'
                  : 'Sao lưu dữ liệu khẩn cấp (JSON)'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
