import React, { useState } from 'react';
import type { Fund, FundMonthlySummary, PeriodFilter, BudgetMode } from '../types';
import { formatMonthYear } from '../utils/date';
import { formatVND } from '../utils/currency';
import { IconRenderer } from './IconRenderer';
import { FundFormModal } from './FundFormModal';
import { ArchiveFundModal } from './ArchiveFundModal';
import { ArchivedFundsModal } from './ArchivedFundsModal';
import { ModeChangeModal } from './ModeChangeModal';
import {
  Briefcase,
  Plus,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Archive,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface FundsViewProps {
  period: PeriodFilter;
  activeFunds: Fund[];
  archivedFunds: Fund[];
  activeSummaries: FundMonthlySummary[];
  budgetOverview: {
    totalBudget: number;
    totalSpending: number;
    totalRemaining: number;
    activeCount: number;
    isCapacityFull: boolean;
  };
  onCreateFund: (data: {
    name: string;
    icon: string;
    color: string;
    defaultBudget: number;
    defaultMode: BudgetMode;
  }) => Promise<Fund>;
  onUpdateFund: (fund: Fund) => Promise<void>;
  onUpdateMonthConfig: (fundId: string, budget: number, mode: BudgetMode) => Promise<void>;
  onArchiveFund: (id: string) => Promise<void>;
  onRestoreFund: (id: string) => Promise<void>;
}

export const FundsView: React.FC<FundsViewProps> = ({
  period,
  activeFunds,
  archivedFunds,
  activeSummaries,
  budgetOverview,
  onCreateFund,
  onUpdateFund,
  onUpdateMonthConfig,
  onArchiveFund,
  onRestoreFund,
}) => {
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [archivingFund, setArchivingFund] = useState<Fund | null>(null);
  const [isArchivedListOpen, setIsArchivedListOpen] = useState(false);

  // Mode change modal state (Wireframe 4, PDR-014)
  const [modeChangeTarget, setModeChangeTarget] = useState<{
    fund: Fund;
    currentMode: BudgetMode;
    targetMode: BudgetMode;
    currentBalance: number;
    projectedBalance: number;
    pendingBudget: number;
  } | null>(null);

  const summariesMap = React.useMemo(() => {
    const map = new Map<string, FundMonthlySummary>();
    for (const s of activeSummaries) {
      map.set(s.fundId, s);
    }
    return map;
  }, [activeSummaries]);

  const handleOpenCreate = () => {
    setEditingFund(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fund: Fund) => {
    setEditingFund(fund);
    setIsFormOpen(true);
  };

  const handleFormSave = async (data: {
    name: string;
    icon: string;
    color: string;
    budget: number;
    mode: BudgetMode;
  }) => {
    if (editingFund) {
      const summary = summariesMap.get(editingFund.id);
      const currentMode = summary?.budgetMode ?? editingFund.defaultMode;

      // If user changed the mode in this month, show Mode Change Confirmation Diff Modal (PDR-014)
      if (currentMode !== data.mode) {
        const opening = summary?.openingBalance ?? 0;
        const effectiveOpening = data.mode === 'rollover' ? opening : 0;
        const projected = effectiveOpening + data.budget - (summary?.monthlySpending ?? 0);

        setModeChangeTarget({
          fund: editingFund,
          currentMode,
          targetMode: data.mode,
          currentBalance: summary?.currentBalance ?? 0,
          projectedBalance: projected,
          pendingBudget: data.budget,
        });

        // Also update basic details (name, icon, color)
        await onUpdateFund({
          ...editingFund,
          name: data.name,
          icon: data.icon,
          color: data.color,
        });
        return;
      }

      // Mode didn't change: update basic fund info and monthly config directly
      await onUpdateFund({
        ...editingFund,
        name: data.name,
        icon: data.icon,
        color: data.color,
      });
      await onUpdateMonthConfig(editingFund.id, data.budget, data.mode);
    } else {
      // Create new fund
      await onCreateFund({
        name: data.name,
        icon: data.icon,
        color: data.color,
        defaultBudget: data.budget,
        defaultMode: data.mode,
      });
    }
  };

  const handleConfirmModeChange = async () => {
    if (modeChangeTarget) {
      await onUpdateMonthConfig(
        modeChangeTarget.fund.id,
        modeChangeTarget.pendingBudget,
        modeChangeTarget.targetMode
      );
      setModeChangeTarget(null);
    }
  };

  return (
    <div className="view-container">
      {/* View Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Quản Lý Quỹ
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Theo dõi ngân sách mục đích chi tiêu trong {formatMonthYear(period.year, period.month)}
        </p>
      </div>

      {/* Month Budget Overview Hero Card (Wireframe 1) */}
      <div
        className="hero-balance-card"
        style={{
          padding: '20px',
          marginBottom: '24px',
          borderRadius: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={20} style={{ color: 'var(--color-brand-primary)' }} />
            <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Tổng quan ngân sách {formatMonthYear(period.year, period.month)}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {activeFunds.length}/10 Quỹ
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Tổng ngân sách
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatVND(budgetOverview.totalBudget)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Đã chi trong Quỹ
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-expense)', fontVariantNumeric: 'tabular-nums' }}>
              -{formatVND(budgetOverview.totalSpending)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Số dư còn lại
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: budgetOverview.totalRemaining < 0 ? 'var(--color-expense)' : 'var(--color-income)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatVND(budgetOverview.totalRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Active Funds Section Header & Actions (Wireframe 1) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Quỹ đang hoạt động</h2>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: budgetOverview.isCapacityFull ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: budgetOverview.isCapacityFull ? 'var(--color-warning, #F59E0B)' : 'var(--color-text-secondary)',
            }}
          >
            {budgetOverview.activeCount} / 10{budgetOverview.isCapacityFull ? ' (Tối đa)' : ''}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreate}
          disabled={budgetOverview.isCapacityFull}
          title={budgetOverview.isCapacityFull ? 'Đã đạt giới hạn tối đa 10 Quỹ' : 'Thêm Quỹ mới'}
          style={{
            fontSize: '0.8125rem',
            padding: '8px 14px',
            gap: '6px',
            backgroundColor: 'var(--color-brand-primary)',
            opacity: budgetOverview.isCapacityFull ? 0.6 : 1,
          }}
        >
          <Plus size={16} />
          <span>+ Thêm Quỹ</span>
        </button>
      </div>

      {/* Capacity Warning Banner if 10/10 */}
      {budgetOverview.isCapacityFull && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: 'var(--color-warning, #F59E0B)',
            fontSize: '0.8125rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Đã sử dụng tối đa 10 Quỹ. Bạn có thể ẩn bớt Quỹ không dùng để tạo Quỹ mới.</span>
        </div>
      )}

      {/* Funds Cards List */}
      {activeFunds.length === 0 ? (
        /* Empty State (Wireframe 1.2) */
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderRadius: '12px',
            border: '1px dashed var(--color-border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--color-brand-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <Briefcase size={28} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '6px' }}>
            Chưa có Quỹ nào
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Tạo các Quỹ ngân sách (như Quỹ Sinh Hoạt, Ăn Uống, Tiết Kiệm...) để kiểm soát dòng tiền chi tiêu theo từng mục đích.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ backgroundColor: 'var(--color-brand-primary)', padding: '10px 20px' }}
          >
            <Plus size={16} />
            <span>Tạo Quỹ đầu tiên</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {activeFunds.map((fund) => {
            const summary = summariesMap.get(fund.id);
            const budget = summary?.monthlyBudget ?? fund.defaultBudget;
            const spending = summary?.monthlySpending ?? 0;
            const balance = summary?.currentBalance ?? budget;
            const mode = summary?.budgetMode ?? fund.defaultMode;
            const percentage = summary?.spendingPercentage ?? 0;
            const isOver = summary?.isOverBudget ?? balance < 0;

            const progressWidth = Math.min(percentage, 100);

            return (
              <div
                key={fund.id}
                onClick={() => handleOpenEdit(fund)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-surface-card)',
                  border: isOver ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                className="hover-card"
              >
                {/* Card Top: Icon, Name, Mode badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
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
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {fund.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {summary?.transactionCount ?? 0} giao dịch
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: mode === 'rollover' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: mode === 'rollover' ? 'var(--color-brand-primary)' : 'var(--color-income)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title={mode === 'rollover' ? 'Chế độ Cộng dồn' : 'Chế độ Đặt lại'}
                    >
                      {mode === 'rollover' ? <RotateCcw size={10} /> : <RefreshCw size={10} />}
                      {mode === 'rollover' ? 'Cộng dồn' : 'Đặt lại'}
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>

                {/* Progress Bar (Wireframe 1) */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {budget > 0 ? `${percentage}% ngân sách` : 'Hạn mức: 0 ₫'}
                    </span>
                    {isOver && (
                      <span style={{ color: 'var(--color-expense)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={12} />
                        VƯỢT NGÂN SÁCH
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressWidth}%`,
                        backgroundColor: isOver ? 'var(--color-expense)' : fund.color,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Metric Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.6875rem' }}>
                      Ngân sách / Đã chi
                    </span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatVND(budget)}
                    </span>
                    <span style={{ color: 'var(--color-expense)', fontSize: '0.75rem', marginLeft: '4px', fontVariantNumeric: 'tabular-nums' }}>
                      (-{formatVND(spending)})
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.6875rem' }}>
                      Số dư khả dụng
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: balance < 0 ? 'var(--color-expense)' : 'var(--color-income)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatVND(balance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Link: Archived Funds (Wireframe 1 & Wireframe 6) */}
      <div style={{ textAlign: 'center', marginTop: '12px', paddingBottom: '32px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsArchivedListOpen(true)}
          style={{
            fontSize: '0.8125rem',
            padding: '8px 16px',
            color: 'var(--color-text-secondary)',
            gap: '8px',
          }}
        >
          <Archive size={15} />
          <span>Quỹ đã ẩn ({archivedFunds.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Modals */}
      <FundFormModal
        isOpen={isFormOpen}
        fund={editingFund}
        activeFunds={activeFunds}
        existingSummary={editingFund ? summariesMap.get(editingFund.id) : null}
        onSave={handleFormSave}
        onArchiveRequest={(fund) => {
          setIsFormOpen(false);
          setArchivingFund(fund);
        }}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFund(null);
        }}
      />

      <ArchiveFundModal
        isOpen={!!archivingFund}
        fundName={archivingFund?.name || ''}
        onConfirm={async () => {
          if (archivingFund) {
            await onArchiveFund(archivingFund.id);
            setArchivingFund(null);
          }
        }}
        onCancel={() => setArchivingFund(null)}
      />

      <ArchivedFundsModal
        isOpen={isArchivedListOpen}
        archivedFunds={archivedFunds}
        activeCount={activeFunds.length}
        onRestore={onRestoreFund}
        onClose={() => setIsArchivedListOpen(false)}
      />

      {modeChangeTarget && (
        <ModeChangeModal
          isOpen={true}
          fundName={modeChangeTarget.fund.name}
          currentMode={modeChangeTarget.currentMode}
          targetMode={modeChangeTarget.targetMode}
          currentBalance={modeChangeTarget.currentBalance}
          projectedBalance={modeChangeTarget.projectedBalance}
          onConfirm={handleConfirmModeChange}
          onCancel={() => setModeChangeTarget(null)}
        />
      )}
    </div>
  );
};
