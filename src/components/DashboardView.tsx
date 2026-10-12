import { useState } from 'react';
import type { SummaryReport, Transaction, Category, Fund, FundMonthlySummary } from '../types';
import { formatVND } from '../utils/currency';
import { formatDateVN, formatMonthYear } from '../utils/date';
import { IconRenderer } from './IconRenderer';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  Receipt,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  Zap,
  Briefcase,
} from 'lucide-react';

interface DashboardViewProps {
  summary: SummaryReport;
  recentTransactions: Transaction[];
  categories: Category[];
  allFunds?: Fund[];
  activeSummaries?: FundMonthlySummary[];
  onOpenEntry: (type: 'expense' | 'income') => void;
  onViewAllTransactions: () => void;
  onViewReports: () => void;
  onViewFunds?: () => void;
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSeedSampleData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  recentTransactions,
  categories,
  allFunds = [],
  activeSummaries = [],
  onOpenEntry,
  onViewAllTransactions,
  onViewReports,
  onViewFunds,
  onEditTransaction,
  onDeleteTransaction,
  onSeedSampleData,
}) => {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const fundMap = new Map<string, Fund>();
  allFunds.forEach((f) => fundMap.set(f.id, f));

  const isNetNegative = summary.netBalance < 0;

  // Derive cashflow status text
  const getCashflowStatus = () => {
    if (summary.totalIncome === 0 && summary.totalExpense === 0) {
      return { label: 'Chưa có phát sinh', color: 'neutral' };
    }
    if (summary.netBalance > 0) {
      return { label: 'Thặng dư ngân sách', color: 'positive' };
    }
    if (summary.netBalance < 0) {
      return { label: 'Chi tiêu vượt thu nhập', color: 'negative' };
    }
    return { label: 'Thu chi cân bằng', color: 'neutral' };
  };

  const status = getCashflowStatus();

  return (
    <div className="dashboard-container">
      {/* Hero Financial KPI Card */}
      <section className="hero-balance-card" aria-label="Tổng quan số dư">
        <div className="balance-meta">
          <div className="balance-meta-left">
            <span className="balance-label">Số dư ròng trong kỳ</span>
            <button
              type="button"
              className="btn-privacy-toggle"
              onClick={() => setIsBalanceHidden((prev) => !prev)}
              title={isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư nhạy cảm'}
              aria-label={isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư nhạy cảm'}
            >
              {isBalanceHidden ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="balance-meta-right">
            <span className={`balance-status-pill ${status.color}`}>
              {status.label}
            </span>
            <span className="balance-period-pill">
              <Calendar size={12} />
              {formatMonthYear(summary.period.year, summary.period.month)}
            </span>
          </div>
        </div>

        <div
          className={`balance-figure num ${
            isNetNegative ? 'balance-negative' : 'balance-positive'
          }`}
        >
          {isBalanceHidden ? '•••••••• ₫' : formatVND(summary.netBalance)}
        </div>

        {/* Metrics Row: Two Distinct Tinted Micro Cards */}
        <div className="metrics-row">
          <div className="metric-card metric-card-income">
            <div className="metric-card-top">
              <span className="metric-sublabel">Tổng thu nhập</span>
              <div className="metric-icon-box metric-icon-income">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="metric-value income num">
              {isBalanceHidden ? '•••••• ₫' : `+${formatVND(summary.totalIncome)}`}
            </div>
          </div>

          <div className="metric-card metric-card-expense">
            <div className="metric-card-top">
              <span className="metric-sublabel">Tổng chi tiêu</span>
              <div className="metric-icon-box metric-icon-expense">
                <TrendingDown size={18} />
              </div>
            </div>
            <div className="metric-value expense num">
              {isBalanceHidden ? '•••••• ₫' : `-${formatVND(summary.totalExpense)}`}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-Only Quick Action Triggers */}
      <div className="mobile-quick-triggers">
        <button
          className="btn btn-hero-trigger btn-expense"
          onClick={() => onOpenEntry('expense')}
        >
          <Plus size={18} />
          Khoản Chi
        </button>
        <button
          className="btn btn-hero-trigger btn-income"
          onClick={() => onOpenEntry('income')}
        >
          <Plus size={18} />
          Khoản Thu
        </button>
      </div>

      {/* Quick Category Spending Breakdown Sneak Peek (Top 3) */}
      {summary.expenseBreakdown.length > 0 && (
        <section className="report-breakdown-card" style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '1rem' }}>
              Chi tiêu theo danh mục
            </h2>
            <button
              className="section-link"
              onClick={onViewReports}
            >
              Xem báo cáo chi tiết <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary.expenseBreakdown.slice(0, 3).map((item) => (
              <div key={item.categoryId} className="breakdown-item">
                <div className="breakdown-meta">
                  <span className="breakdown-cat-name">
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: item.categoryColor,
                        display: 'inline-block',
                      }}
                    />
                    {item.categoryName}
                  </span>
                  <div className="breakdown-figures">
                    <span className="breakdown-amount num">
                      {isBalanceHidden ? '•••• ₫' : formatVND(item.totalAmount)}
                    </span>
                    <span className="breakdown-pct num">{item.percentage}%</span>
                  </div>
                </div>
                <div className="breakdown-bar-track">
                  <div
                    className="breakdown-bar-fill"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.categoryColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Fund Status Glance */}
      {activeSummaries.length > 0 && (
        <section className="report-breakdown-card" style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} /> Quỹ chi tiêu tháng này
            </h2>
            {onViewFunds && (
              <button className="section-link" onClick={onViewFunds}>
                Quản lý Quỹ <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {activeSummaries.slice(0, 3).map((item) => {
              const isOver = item.currentBalance < 0;
              return (
                <div
                  key={item.fundId}
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: item.fundColor,
                          display: 'inline-block',
                        }}
                      />
                      {item.fundName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isOver ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isOver ? 'var(--color-expense)' : 'var(--color-income)',
                      }}
                    >
                      {isOver ? 'Bội chi' : 'Khả dụng'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      marginTop: '2px',
                    }}
                    className={`num ${isOver ? 'expense' : ''}`}
                  >
                    {isBalanceHidden ? '•••• ₫' : formatVND(item.currentBalance)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Transactions List */}
      <section className="recent-transactions-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="section-title">Giao dịch gần đây</h2>
            {summary.transactionCount > 0 && (
              <span className="badge-count">{summary.transactionCount}</span>
            )}
          </div>
          {recentTransactions.length > 0 && (
            <button
              className="section-link"
              onClick={onViewAllTransactions}
            >
              Xem tất cả <ArrowRight size={14} />
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <Receipt size={24} />
            </div>
            <div className="empty-title">Chưa có giao dịch trong tháng này</div>
            <p className="empty-desc">
              Ghi lại khoản thu chi đầu tiên của bạn chỉ trong vài giây hoặc nạp ngay dữ liệu mẫu để trải nghiệm.
            </p>
            <div className="empty-actions-row">
              <button
                className="btn btn-expense"
                onClick={() => onOpenEntry('expense')}
              >
                <Plus size={16} /> Thêm Khoản Chi
              </button>
              <button
                className="btn btn-income"
                onClick={() => onOpenEntry('income')}
              >
                <Plus size={16} /> Thêm Khoản Thu
              </button>
            </div>
            {onSeedSampleData && (
              <button
                type="button"
                className="btn btn-seed-sample"
                onClick={onSeedSampleData}
              >
                <Sparkles size={15} />
                <span>Nạp dữ liệu mẫu thử nghiệm</span>
              </button>
            )}
            <div className="empty-shortcut-hint">
              <Zap size={13} />
              <span>Phím tắt: <strong>C</strong> = Khoản Chi, <strong>T</strong> = Khoản Thu</span>
            </div>
          </div>
        ) : (
          <div className="transaction-list">
            {recentTransactions.map((txn) => {
              const cat = categoryMap.get(txn.categoryId);
              const catName = cat ? cat.name : 'Chưa phân loại';
              const catIcon = cat ? cat.icon : 'HelpCircle';
              const catColor = cat ? cat.color : '#64748B';
              const isExpense = txn.type === 'expense';
              const fund = txn.fundId ? fundMap.get(txn.fundId) : null;

              return (
                <div key={txn.id} className="transaction-card">
                  <div className="txn-left">
                    <div
                      className="txn-icon-badge"
                      style={{
                        backgroundColor: `${catColor}1A`,
                        color: catColor,
                      }}
                    >
                      <IconRenderer name={catIcon} size={18} />
                    </div>
                    <div className="txn-info">
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span className="txn-category">{catName}</span>
                        {fund && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: `${fund.color}1E`,
                              color: fund.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              border: `1px solid ${fund.color}35`,
                            }}
                            title={`Quỹ: ${fund.name}${fund.isArchived ? ' (Đã ẩn)' : ''}`}
                          >
                            <Briefcase size={10} />
                            <span>{fund.name}</span>
                            {fund.isArchived && <em style={{ fontSize: '0.625rem', opacity: 0.75 }}>(Đã ẩn)</em>}
                          </span>
                        )}
                      </div>
                      <div className="txn-note-date">
                        <span className="txn-date">
                          {formatDateVN(txn.transactionDate, true)}
                        </span>
                        {txn.note && (
                          <>
                            <span>•</span>
                            <span className="txn-note" title={txn.note}>
                              {txn.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="txn-right">
                    <span
                      className={`txn-amount num ${
                        isExpense ? 'expense' : 'income'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatVND(txn.amount)}
                    </span>
                    <div className="txn-actions">
                      <button
                        className="btn-icon-action"
                        onClick={() => onEditTransaction(txn)}
                        title="Sửa giao dịch"
                        aria-label="Sửa giao dịch"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-icon-action danger"
                        onClick={() => onDeleteTransaction(txn.id)}
                        title="Xóa giao dịch"
                        aria-label="Xóa giao dịch"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
