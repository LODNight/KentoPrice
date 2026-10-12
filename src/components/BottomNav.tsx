import React, { useState } from 'react';
import { Home, CheckSquare, CircleDollarSign, PieChart, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'history' | 'funds' | 'reports' | 'settings') => void;
  onOpenEntry: (type: 'expense' | 'income') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenEntry,
}) => {
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const handleSelectTab = (tab: 'dashboard' | 'history' | 'funds' | 'reports') => {
    setIsQuickMenuOpen(false);
    onSelectTab(tab);
  };

  const handleTriggerEntry = (type: 'expense' | 'income') => {
    setIsQuickMenuOpen(false);
    onOpenEntry(type);
  };

  return (
    <>
      {/* Dim backdrop when center FAB speed-dial is expanded */}
      {isQuickMenuOpen && (
        <div
          className="fab-speed-dial-backdrop"
          onClick={() => setIsQuickMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Speed Dial Menu for Khoản Chi / Khoản Thu */}
      {isQuickMenuOpen && (
        <div className="fab-speed-dial-menu" role="menu" aria-label="Tùy chọn ghi nhanh">
          <button
            type="button"
            className="speed-dial-item expense"
            onClick={() => handleTriggerEntry('expense')}
            role="menuitem"
          >
            <span className="speed-dial-badge">
              <ArrowDownLeft size={18} strokeWidth={2.5} />
            </span>
            <span className="speed-dial-label">Thêm Khoản Chi</span>
          </button>

          <button
            type="button"
            className="speed-dial-item income"
            onClick={() => handleTriggerEntry('income')}
            role="menuitem"
          >
            <span className="speed-dial-badge">
              <ArrowUpRight size={18} strokeWidth={2.5} />
            </span>
            <span className="speed-dial-label">Thêm Khoản Thu</span>
          </button>
        </div>
      )}

      <nav className="mobile-bottom-bar" aria-label="Thanh điều hướng di động">
        {/* SVG Curved Notch Background */}
        <div className="bottom-bar-bg-container" aria-hidden="true">
          <div className="bottom-bar-wing left" />
          <div className="bottom-bar-notch">
            <svg viewBox="0 0 96 80" width="96" height="100%" preserveAspectRatio="none">
              {/* Card fill silhouette */}
              <path
                d="M 0,0 C 14,0 18,8 24,18 C 32,32 40,36 48,36 C 56,36 64,32 72,18 C 78,8 82,0 96,0 L 96,80 L 0,80 Z"
                fill="var(--color-surface-card)"
              />
              {/* Continuous top outline border */}
              <path
                d="M 0,0.5 C 14,0.5 18,8 24,18 C 32,32 40,36 48,36 C 56,36 64,32 72,18 C 78,8 82,0.5 96,0.5"
                fill="none"
                stroke="var(--color-border-subtle)"
                strokeWidth="1"
              />
            </svg>
          </div>
          <div className="bottom-bar-wing right" />
        </div>

        {/* 4 Interactive Navigation Buttons */}
        <div className="bottom-bar-nav-grid">
          {/* 1. Home (Tổng quan) */}
          <button
            type="button"
            className={`mobile-nav-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleSelectTab('dashboard')}
            aria-current={currentTab === 'dashboard' ? 'page' : undefined}
          >
            <Home size={22} strokeWidth={currentTab === 'dashboard' ? 2.3 : 1.8} />
            <span>Tổng quan</span>
          </button>

          {/* 2. My task (Sổ ghi) */}
          <button
            type="button"
            className={`mobile-nav-btn ${currentTab === 'history' ? 'active' : ''}`}
            onClick={() => handleSelectTab('history')}
            aria-current={currentTab === 'history' ? 'page' : undefined}
          >
            <CheckSquare size={21} strokeWidth={currentTab === 'history' ? 2.3 : 1.8} />
            <span>Sổ ghi</span>
          </button>

          {/* Center spacer reserving space for Notch & FAB */}
          <div className="mobile-nav-fab-spacer" />

          {/* 3. Payment (Quỹ) */}
          <button
            type="button"
            className={`mobile-nav-btn ${currentTab === 'funds' ? 'active' : ''}`}
            onClick={() => handleSelectTab('funds')}
            aria-current={currentTab === 'funds' ? 'page' : undefined}
          >
            <CircleDollarSign size={22} strokeWidth={currentTab === 'funds' ? 2.3 : 1.8} />
            <span>Quỹ</span>
          </button>

          {/* 4. Profile / Reports (Báo cáo) */}
          <button
            type="button"
            className={`mobile-nav-btn ${currentTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleSelectTab('reports')}
            aria-current={currentTab === 'reports' ? 'page' : undefined}
          >
            <PieChart size={21} strokeWidth={currentTab === 'reports' ? 2.3 : 1.8} />
            <span>Báo cáo</span>
          </button>
        </div>

        {/* Center Prominent Elevated FAB Button */}
        <button
          type="button"
          className={`mobile-center-fab ${isQuickMenuOpen ? 'open' : ''}`}
          onClick={() => setIsQuickMenuOpen((prev) => !prev)}
          aria-label={isQuickMenuOpen ? 'Đóng menu ghi nhanh' : 'Mở menu ghi nhanh'}
          aria-expanded={isQuickMenuOpen}
        >
          <Plus
            size={26}
            strokeWidth={2.6}
            style={{
              transform: isQuickMenuOpen ? 'rotate(45deg)' : 'none',
              transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          />
        </button>
      </nav>
    </>
  );
};
