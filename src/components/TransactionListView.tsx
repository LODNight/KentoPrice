import React, { useState, useMemo } from 'react';
import type { Transaction, Category, TransactionType, Fund } from '../types';
import { formatVND } from '../utils/currency';
import { formatDateVN } from '../utils/date';
import { IconRenderer } from './IconRenderer';
import { Edit2, Trash2, Filter, Receipt, Plus, Briefcase } from 'lucide-react';

interface TransactionListViewProps {
  transactions: Transaction[];
  categories: Category[];
  allFunds?: Fund[];
  onOpenEntry: (type: 'expense' | 'income') => void;
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  transactions,
  categories,
  allFunds = [],
  onOpenEntry,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedFundId, setSelectedFundId] = useState<string>('all');

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const fundMap = useMemo(() => {
    const map = new Map<string, Fund>();
    allFunds.forEach((f) => map.set(f.id, f));
    return map;
  }, [allFunds]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;
      if (selectedFundId !== 'all') {
        if (selectedFundId === 'none') {
          if (t.fundId) return false;
        } else if (t.fundId !== selectedFundId) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, selectedCategoryId, selectedFundId]);

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: Transaction[]; dailyExpense: number; dailyIncome: number }[] = [];
    const groupMap = new Map<string, Transaction[]>();

    // Sort descending by date, then by createdAt
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateCmp = b.transactionDate.localeCompare(a.transactionDate);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });

    sorted.forEach((txn) => {
      const list = groupMap.get(txn.transactionDate) || [];
      list.push(txn);
      groupMap.set(txn.transactionDate, list);
    });

    groupMap.forEach((items, date) => {
      let dailyExpense = 0;
      let dailyIncome = 0;
      items.forEach((t) => {
        if (t.type === 'expense') dailyExpense += t.amount;
        if (t.type === 'income') dailyIncome += t.amount;
      });
      groups.push({ date, items, dailyExpense, dailyIncome });
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="transaction-history-container">
      {/* Header and Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Sổ Giao Dịch</h1>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Tổng số: <strong style={{ color: 'var(--color-text-primary)' }}>{filteredTransactions.length}</strong> giao dịch
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="history-filter-toolbar">
          {/* Type Segmented Filter */}
          <div className="filter-segmented-group" role="group" aria-label="Lọc theo loại giao dịch">
            <button
              className={`filter-pill ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              Tất cả
            </button>
            <button
              className={`filter-pill expense ${typeFilter === 'expense' ? 'active' : ''}`}
              onClick={() => setTypeFilter('expense')}
            >
              Chỉ Chi Tiêu
            </button>
            <button
              className={`filter-pill income ${typeFilter === 'income' ? 'active' : ''}`}
              onClick={() => setTypeFilter('income')}
            >
              Chỉ Thu Nhập
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="filter-category-select-wrap">
            <Filter size={15} color="var(--color-text-muted)" />
            <select
              className="text-input filter-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              aria-label="Lọc theo danh mục"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'expense' ? 'Chi' : 'Thu'})
                </option>
              ))}
            </select>
          </div>

          {allFunds.length > 0 && (
            <div className="filter-select-wrapper" style={{ minWidth: '150px' }}>
              <Briefcase size={15} color="var(--color-text-muted)" />
              <select
                className="text-input filter-select"
                value={selectedFundId}
                onChange={(e) => setSelectedFundId(e.target.value)}
                aria-label="Lọc theo Quỹ"
              >
                <option value="all">Tất cả Quỹ</option>
                <option value="none">Không gắn Quỹ</option>
                {allFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.isArchived ? '(Đã ẩn)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List Grouped by Date */}
      {groupedByDate.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-box">
            <Receipt size={24} />
          </div>
          <div className="empty-title">Không tìm thấy giao dịch nào</div>
          <p className="empty-desc">
            Không có giao dịch nào khớp với bộ lọc hiện tại. Thử chọn &quot;Tất cả&quot; hoặc thêm giao dịch mới.
          </p>
          <button
            className="btn btn-expense"
            style={{ marginTop: '8px' }}
            onClick={() => onOpenEntry('expense')}
          >
            <Plus size={16} /> Thêm Giao Dịch
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedByDate.map((group) => (
            <div key={group.date}>
              {/* Date Group Header with Daily Totals */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  marginBottom: '8px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {formatDateVN(group.date, true)}
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {group.dailyIncome > 0 && (
                    <span style={{ color: 'var(--color-income)' }} className="num">
                      +{formatVND(group.dailyIncome)}
                    </span>
                  )}
                  {group.dailyExpense > 0 && (
                    <span style={{ color: 'var(--color-expense)' }} className="num">
                      -{formatVND(group.dailyExpense)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transaction Cards in Group */}
              <div className="transaction-list">
                {group.items.map((txn) => {
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
                            {txn.note ? (
                              <span className="txn-note" title={txn.note}>
                                {txn.note}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>Không có ghi chú</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="txn-right">
                        <span className={`txn-amount num ${isExpense ? 'expense' : 'income'}`}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
