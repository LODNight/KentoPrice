import React from 'react';
import {
  Wallet,
  Plus,
  LayoutDashboard,
  List,
  PieChart,
  Settings,
  Briefcase,
  Cloud,
  CloudOff,
  Loader2,
  Check,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings') => void;
  onOpenEntry: (type: 'expense' | 'income') => void;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error' | 'disabled';
  lastSyncedAt?: Date | null;
  onSyncClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenEntry,
  syncStatus = 'idle',
  lastSyncedAt,
  onSyncClick,
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Left: Brand */}
        <div className="app-brand">
          <div className="brand-icon">
            <Wallet size={18} />
          </div>
          <div className="brand-text">
            <span className="brand-title">KentoPrice</span>
            <span className="brand-tag">Bản thử nghiệm</span>
          </div>
        </div>

        {/* Center: Desktop Nav Links (Wireframe 0.2 & PDR-016) */}
        <nav className="desktop-nav" aria-label="Desktop Navigation">
          <button
            className={`desktop-nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onSelectTab('dashboard')}
          >
            <LayoutDashboard size={15} />
            <span>Tổng quan</span>
          </button>
          <button
            className={`desktop-nav-link ${currentTab === 'history' ? 'active' : ''}`}
            onClick={() => onSelectTab('history')}
          >
            <List size={15} />
            <span>Sổ giao dịch</span>
          </button>
          <button
            className={`desktop-nav-link ${currentTab === 'funds' ? 'active' : ''}`}
            onClick={() => onSelectTab('funds')}
          >
            <Briefcase size={15} />
            <span>Quỹ</span>
          </button>
          <button
            className={`desktop-nav-link ${currentTab === 'reports' ? 'active' : ''}`}
            onClick={() => onSelectTab('reports')}
          >
            <PieChart size={15} />
            <span>Báo cáo</span>
          </button>
          <button
            className={`desktop-nav-link ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => onSelectTab('settings')}
          >
            <Settings size={15} />
            <span>Cài đặt</span>
          </button>
        </nav>

        {/* Right: Controls & Quick Entry Actions */}
        <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Cloud Sync Status Indicator */}
          {syncStatus !== 'disabled' && (
            <button
              type="button"
              onClick={onSyncClick || (() => onSelectTab('settings'))}
              className="btn-sync-status-indicator"
              title={
                syncStatus === 'syncing'
                  ? 'Đang tự động đồng bộ lên Google Sheets...'
                  : syncStatus === 'synced'
                  ? `Đã lưu đám mây lúc ${lastSyncedAt ? lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}`
                  : syncStatus === 'error'
                  ? 'Đồng bộ Google Sheets gặp lỗi (Bấm để xem)'
                  : 'Đồng bộ Google Sheets'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                background: 'var(--color-surface)',
                border: `1px solid ${
                  syncStatus === 'error'
                    ? 'rgba(239, 68, 68, 0.4)'
                    : syncStatus === 'synced'
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'var(--color-border-subtle)'
                }`,
                cursor: 'pointer',
                color:
                  syncStatus === 'syncing'
                    ? 'var(--color-brand-primary)'
                    : syncStatus === 'synced'
                    ? 'var(--color-income)'
                    : syncStatus === 'error'
                    ? 'var(--color-expense)'
                    : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {syncStatus === 'syncing' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : syncStatus === 'synced' ? (
                <Check size={12} strokeWidth={2.5} />
              ) : syncStatus === 'error' ? (
                <CloudOff size={12} />
              ) : (
                <Cloud size={12} />
              )}
              <span style={{ whiteSpace: 'nowrap' }}>
                {syncStatus === 'syncing'
                  ? 'Đang lưu...'
                  : syncStatus === 'synced'
                  ? 'Đã lưu Cloud'
                  : syncStatus === 'error'
                  ? 'Lỗi Cloud'
                  : 'Cloud'}
              </span>
            </button>
          )}

          {/* Mobile Settings Shortcut */}
          <button
            type="button"
            className={`btn-header-mobile-settings ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => onSelectTab('settings')}
            title="Cài đặt"
            aria-label="Cài đặt"
          >
            <Settings size={18} />
          </button>

          {/* Desktop Quick Entry Triggers */}
          <div className="desktop-quick-actions">
            <button
              className="btn-quick-header btn-quick-expense"
              onClick={() => onOpenEntry('expense')}
              title="Thêm khoản chi mới (Phím C)"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Khoản Chi</span>
              <kbd className="kbd-hint">C</kbd>
            </button>
            <button
              className="btn-quick-header btn-quick-income"
              onClick={() => onOpenEntry('income')}
              title="Thêm khoản thu mới (Phím T)"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Khoản Thu</span>
              <kbd className="kbd-hint">T</kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
