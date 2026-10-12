import { useState } from 'react';
import type { SummaryReport, Transaction, Category } from '../types';
import { formatVND } from '../utils/currency';
import { formatMonthYear, formatDateVN } from '../utils/date';
import { IconRenderer } from './IconRenderer';
import { TrendingDown, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportsViewProps {
  summary: SummaryReport;
  transactions: Transaction[];
  categories: Category[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  transactions,
  categories,
}) => {
  const [activeDrillDownCategory, setActiveDrillDownCategory] = useState<string | null>(null);

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Transactions within current period
  const periodTransactions = transactions.filter(
    (t) => t.transactionDate >= summary.period.startDate && t.transactionDate <= summary.period.endDate
  );

  const isNetNegative = summary.netBalance < 0;

  const toggleDrillDown = (catId: string) => {
    setActiveDrillDownCategory((prev) => (prev === catId ? null : catId));
  };

  return (
    <div className="reports-container">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          Báo Cáo Thu Chi — {formatMonthYear(summary.period.year, summary.period.month)}
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Phân tích tỷ trọng dòng tiền và cơ cấu chi tiêu thực tế
        </p>
      </div>

      {/* KPI Overview Strip */}
      <div className="report-kpi-grid">
        <div className="metric-card metric-card-income">
          <div className="metric-card-top">
            <span className="metric-sublabel">Tổng thu nhập</span>
            <div className="metric-icon-box metric-icon-income">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value income num" style={{ fontSize: '1.35rem', marginTop: '6px' }}>
            +{formatVND(summary.totalIncome)}
          </div>
        </div>

        <div className="metric-card metric-card-expense">
          <div className="metric-card-top">
            <span className="metric-sublabel">Tổng chi tiêu</span>
            <div className="metric-icon-box metric-icon-expense">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="metric-value expense num" style={{ fontSize: '1.35rem', marginTop: '6px' }}>
            -{formatVND(summary.totalExpense)}
          </div>
        </div>

        <div className="metric-card" style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="metric-card-top">
            <span className="metric-sublabel">Chênh lệch dòng tiền</span>
            <div
              className="metric-icon-box"
              style={{
                backgroundColor: isNetNegative ? 'var(--color-expense-bg)' : 'var(--color-income-bg)',
                color: isNetNegative ? 'var(--color-expense)' : 'var(--color-income)',
              }}
            >
              {isNetNegative ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
            </div>
          </div>
          <div
            className={`metric-value num ${isNetNegative ? 'balance-negative' : 'balance-positive'}`}
            style={{ fontSize: '1.35rem', marginTop: '6px' }}
          >
            {formatVND(summary.netBalance)}
          </div>
        </div>
      </div>

      {/* Expense Category Breakdown Section */}
      <section className="report-breakdown-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} color="var(--color-expense)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Cơ cấu Khoản Chi ({summary.expenseBreakdown.length} danh mục)</h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Nhấn vào danh mục để xem chi tiết
          </span>
        </div>

        {summary.expenseBreakdown.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>
            Chưa có khoản chi nào trong kỳ này.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {summary.expenseBreakdown.map((item) => {
              const isDrilledDown = activeDrillDownCategory === item.categoryId;
              const catTransactions = periodTransactions.filter(
                (t) => t.type === 'expense' && t.categoryId === item.categoryId
              );

              return (
                <div
                  key={item.categoryId}
                  style={{
                    backgroundColor: isDrilledDown ? 'var(--color-surface-elevated)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  {/* Category Progress Item Header */}
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleDrillDown(item.categoryId)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isDrilledDown}
                  >
                    <div className="breakdown-meta">
                      <div className="breakdown-cat-name">
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: `${item.categoryColor}20`,
                            color: item.categoryColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconRenderer name={item.categoryIcon} size={14} />
                        </div>
                        <span>{item.categoryName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          ({item.transactionCount} lần)
                        </span>
                      </div>

                      <div className="breakdown-figures">
                        <span className="breakdown-amount num expense" style={{ color: 'var(--color-expense)' }}>
                          {formatVND(item.totalAmount)}
                        </span>
                        <span className="breakdown-pct num">{item.percentage}%</span>
                        {isDrilledDown ? (
                          <ChevronUp size={16} color="var(--color-text-muted)" />
                        ) : (
                          <ChevronDown size={16} color="var(--color-text-muted)" />
                        )}
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

                  {/* Drill-down Transaction Ledger */}
                  {isDrilledDown && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: 'var(--color-bg-base)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        Các giao dịch chi tiêu thuộc &quot;{item.categoryName}&quot;:
                      </span>
                      {catTransactions.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 0',
                            borderBottom: '1px solid var(--color-border-subtle)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{formatDateVN(t.transactionDate)}</span>
                            <span>{t.note || 'Không có ghi chú'}</span>
                          </div>
                          <span className="num" style={{ fontWeight: 600, color: 'var(--color-expense)' }}>
                            -{formatVND(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Income Category Breakdown Section */}
      {summary.incomeBreakdown.length > 0 && (
        <section className="report-breakdown-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="var(--color-income)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Cơ cấu Nguồn Thu ({summary.incomeBreakdown.length} nguồn)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {summary.incomeBreakdown.map((item) => (
              <div key={item.categoryId} className="breakdown-item">
                <div className="breakdown-meta">
                  <div className="breakdown-cat-name">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: `${item.categoryColor}20`,
                        color: item.categoryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconRenderer name={item.categoryIcon} size={14} />
                    </div>
                    <span>{item.categoryName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ({item.transactionCount} lần)
                    </span>
                  </div>

                  <div className="breakdown-figures">
                    <span className="breakdown-amount num income" style={{ color: 'var(--color-income)' }}>
                      +{formatVND(item.totalAmount)}
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
    </div>
  );
};
