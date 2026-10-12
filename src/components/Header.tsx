import React from 'react';
import {
  Wallet,
  Plus,
  LayoutDashboard,
  List,
  PieChart,
  Settings,
  Briefcase,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings') => void;
  onOpenEntry: (type: 'expense' | 'income') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenEntry,
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
        <div className="header-right-group">
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
