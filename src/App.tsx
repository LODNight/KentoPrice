import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Transaction, PeriodFilter, TransactionType, BudgetMode } from './types';
import { calculateSummary } from './utils/calculator';
import { getMonthDateRange } from './utils/date';
import { useCategories } from './hooks/useCategories';
import { useTransactions } from './hooks/useTransactions';
import { useFunds } from './hooks/useFunds';
import { useAutoSync, autoSyncManager } from './hooks/useAutoSync';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TransactionListView } from './components/TransactionListView';
import { FundsView } from './components/FundsView';
import { ReportsView } from './components/ReportsView';
import { BottomNav } from './components/BottomNav';
import { TransactionEntryModal } from './components/TransactionEntryModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SettingsView } from './components/SettingsView';
import { CategoryManagementModal } from './components/CategoryManagementModal';
import { PeriodNavigator } from './components/PeriodNavigator';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MOCK_TRANSACTIONS } from './data/mockData';

export function App() {
  // Current active period (defaults to current calendar month)
  const [period, setPeriod] = useState<PeriodFilter>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const { startDate, endDate } = getMonthDateRange(year, month);
    return {
      type: 'month',
      year,
      month,
      startDate,
      endDate,
    };
  });

  // Layer 2: Feature Hooks managing application logic and persistent repository calls
  const {
    categories,
    loading: catLoading,
    error: catError,
    reloadCategories,
    createCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
    deleteCategory,
    getCategoryUsage,
  } = useCategories();
  const {
    periodTransactions,
    allTransactions,
    loading: txnLoading,
    error: txnError,
    reload,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(period);

  const {
    allFunds,
    activeFunds,
    archivedFunds,
    activeFundSummaries,
    budgetOverview,
    createFund,
    updateFund,
    updateMonthConfig,
    archiveFund,
    restoreFund,
    reloadFunds,
  } = useFunds(period, allTransactions);

  // Layer 2: Automatic Background Cloud Sync Engine
  const {
    syncStatus,
    lastSyncedAt,
    triggerAutoSync,
    pullFromCloud,
  } = useAutoSync(3000);

  // Listen for data restored from Cloud (Pull) to refresh all states
  // After restore, auto-navigate to the period containing the most recent pulled transaction
  useEffect(() => {
    const unsubscribe = autoSyncManager.subscribeDataRestored(async () => {
      await reloadCategories();
      const allTxns = await reload();
      await reloadFunds();

      // Auto-navigate to the month of the most recent transaction if current period is empty
      if (allTxns && allTxns.length > 0) {
        // Find the most recent transaction date
        const latestDateStr = allTxns.reduce((latest: string, txn: { transactionDate: string }) =>
          txn.transactionDate > latest ? txn.transactionDate : latest, '');

        if (latestDateStr) {
          const [yyyy, mm] = latestDateStr.split('-').map(Number);
          setPeriod((prev) => {
            // Only switch if the current period has no data in this month
            const hasDataInCurrentPeriod = allTxns.some(
              (t: { transactionDate: string }) => t.transactionDate >= prev.startDate && t.transactionDate <= prev.endDate
            );
            if (!hasDataInCurrentPeriod && yyyy && mm) {
              const { startDate, endDate } = getMonthDateRange(yyyy, mm);
              return { type: 'month', year: yyyy, month: mm, startDate, endDate };
            }
            return prev;
          });
        }
      }
    });
    return unsubscribe;
  }, [reloadCategories, reload, reloadFunds, setPeriod]);


  // Smart background pull on app mount (respects 2-minute cooldown and metadata check)
  useEffect(() => {
    pullFromCloud();
  }, [pullFromCloud]);

  // Revalidate on window focus OR tab visibility change (handles tab switching, mobile, etc.)
  useEffect(() => {
    const handleFocus = () => {
      pullFromCloud();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        pullFromCloud();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pullFromCloud]);

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'funds' | 'reports' | 'settings'>('dashboard');

  // Modal States
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; txnId: string | null }>({
    isOpen: false,
    txnId: null,
  });
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);

  // Explicit mutation handlers for Categories with auto-sync trigger
  const handleCreateCategory = useCallback(
    async (data: Parameters<typeof createCategory>[0]) => {
      const res = await createCategory(data);
      triggerAutoSync();
      return res;
    },
    [createCategory, triggerAutoSync]
  );

  const handleUpdateCategory = useCallback(
    async (cat: Parameters<typeof updateCategory>[0]) => {
      await updateCategory(cat);
      triggerAutoSync();
    },
    [updateCategory, triggerAutoSync]
  );

  const handleArchiveCategory = useCallback(
    async (id: string) => {
      await archiveCategory(id);
      triggerAutoSync();
    },
    [archiveCategory, triggerAutoSync]
  );

  const handleRestoreCategory = useCallback(
    async (id: string) => {
      await restoreCategory(id);
      triggerAutoSync();
    },
    [restoreCategory, triggerAutoSync]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      await deleteCategory(id);
      triggerAutoSync();
    },
    [deleteCategory, triggerAutoSync]
  );

  // Explicit mutation handlers for Funds with auto-sync trigger
  const handleCreateFund = useCallback(
    async (data: Parameters<typeof createFund>[0]) => {
      const res = await createFund(data);
      triggerAutoSync();
      return res;
    },
    [createFund, triggerAutoSync]
  );

  const handleUpdateFund = useCallback(
    async (data: Parameters<typeof updateFund>[0]) => {
      await updateFund(data);
      triggerAutoSync();
    },
    [updateFund, triggerAutoSync]
  );

  const handleUpdateMonthConfig = useCallback(
    async (fundId: string, ym: string, budget: number, mode?: BudgetMode) => {
      await updateMonthConfig(fundId, ym, budget, mode);
      triggerAutoSync();
    },
    [updateMonthConfig, triggerAutoSync]
  );

  const handleArchiveFund = useCallback(
    async (id: string) => {
      await archiveFund(id);
      triggerAutoSync();
    },
    [archiveFund, triggerAutoSync]
  );

  const handleRestoreFund = useCallback(
    async (id: string) => {
      await restoreFund(id);
      triggerAutoSync();
    },
    [restoreFund, triggerAutoSync]
  );

  // Purely derived summary report (stateless, zero stale caching)
  const summary = useMemo(() => {
    return calculateSummary(periodTransactions, categories, period);
  }, [periodTransactions, categories, period]);

  // Recent transactions for the current period (top 5 sorted by date)
  const recentTransactions = useMemo(() => {
    return periodTransactions.slice(0, 5);
  }, [periodTransactions]);

  // Open entry modal for new transaction
  const handleOpenEntry = useCallback((type: TransactionType) => {
    setEditingTransaction(null);
    setEntryType(type);
    setIsEntryOpen(true);
  }, []);

  // Open entry modal for editing transaction
  const handleEditTransaction = useCallback((txn: Transaction) => {
    setEditingTransaction(txn);
    setEntryType(txn.type);
    setIsEntryOpen(true);
  }, []);

  // Request deletion
  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteModal({ isOpen: true, txnId: id });
  }, []);

  // Confirm deletion
  const handleConfirmDelete = useCallback(async () => {
    if (deleteModal.txnId) {
      await deleteTransaction(deleteModal.txnId);
      setDeleteModal({ isOpen: false, txnId: null });
      triggerAutoSync();
    }
  }, [deleteModal.txnId, deleteTransaction, triggerAutoSync]);

  // Save transaction handler (Create or Update with IndexedDB persistence)
  const handleSaveTransaction = useCallback(
    async (data: {
      type: TransactionType;
      amount: number;
      categoryId: string;
      transactionDate: string;
      note?: string;
      fundId?: string | null;
    }) => {
      if (editingTransaction) {
        // Update existing
        await updateTransaction({
          ...editingTransaction,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new
        await createTransaction(data);
      }
      await reloadFunds();
      triggerAutoSync();
    },
    [editingTransaction, createTransaction, updateTransaction, reloadFunds, triggerAutoSync]
  );


  // Optional helper to seed sample data into IndexedDB for instant testing
  const handleSeedSampleData = useCallback(async () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

    // 1. Seed 3 sample funds if none exist
    let livingFundId: string | undefined;
    let diningFundId: string | undefined;
    if (allFunds.length === 0) {
      const fund1 = await createFund({
        name: 'Quỹ Sinh Hoạt',
        icon: 'wallet',
        color: '#3B82F6',
        defaultBudget: 5000000,
        defaultMode: 'rollover',
      });
      livingFundId = fund1.id;

      const fund2 = await createFund({
        name: 'Ăn Uống & Cafe',
        icon: 'coffee',
        color: '#F59E0B',
        defaultBudget: 3000000,
        defaultMode: 'reset',
      });
      diningFundId = fund2.id;

      await createFund({
        name: 'Quỹ Học Tập',
        icon: 'book',
        color: '#10B981',
        defaultBudget: 0,
        defaultMode: 'reset',
      });
    } else {
      livingFundId = allFunds[0]?.id;
      diningFundId = allFunds[1]?.id;
    }

    // 2. Adapt sample transactions to current active month and tag funds
    for (const mock of MOCK_TRANSACTIONS) {
      const day = mock.transactionDate.split('-')[2];
      const adaptedDate = `${currentYear}-${currentMonth}-${day}`;
      const assignedFund =
        mock.categoryId === 'cat_food'
          ? diningFundId
          : mock.categoryId === 'cat_utilities'
          ? livingFundId
          : undefined;

      await createTransaction({
        type: mock.type,
        amount: mock.amount,
        categoryId: mock.categoryId,
        transactionDate: adaptedDate,
        note: mock.note,
        fundId: assignedFund,
      });
    }
    await reload();
    await reloadFunds();
  }, [allFunds, createFund, createTransaction, reload, reloadFunds]);

  // Reset all transactions safeguard
  const handleResetData = useCallback(async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu giao dịch đã lưu trong IndexedDB không?')) {
      for (const t of allTransactions) {
        await deleteTransaction(t.id);
      }
      await reload();
    }
  }, [allTransactions, deleteTransaction, reload]);

  // Global desktop keyboard shortcuts ('C' for Chi, 'T' for Thu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isEntryOpen ||
        deleteModal.isOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleOpenEntry('expense');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleOpenEntry('income');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEntryOpen, deleteModal.isOpen, handleOpenEntry]);

  // Explicit failure if IndexedDB is blocked or unavailable
  if (catError || txnError) {
    const errorMessage = catError || txnError;
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="hero-balance-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '32px' }}>
          <div style={{ color: 'var(--color-expense)', marginBottom: '16px' }}>
            <AlertCircle size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
            Không thể khởi tạo cơ sở dữ liệu
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            {errorMessage}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} /> Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  const isLoading = catLoading || txnLoading;

  return (
    <div className="app-container">
      {/* Global Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenEntry={handleOpenEntry}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onSyncClick={() => pullFromCloud({ force: true })}
      />


      {/* Main View Area */}
      <main className="main-content">
        {/* Period Navigator: Under Navbar, Above Transactions & Content */}
        {currentTab !== 'settings' && (
          <PeriodNavigator
            period={period}
            onPeriodChange={setPeriod}
          />
        )}

        {isLoading && periodTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            Đang tải dữ liệu từ IndexedDB...
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                recentTransactions={recentTransactions}
                categories={categories}
                allFunds={allFunds}
                activeSummaries={activeFundSummaries}
                onOpenEntry={handleOpenEntry}
                onViewAllTransactions={() => setCurrentTab('history')}
                onViewReports={() => setCurrentTab('reports')}
                onViewFunds={() => setCurrentTab('funds')}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteRequest}
                onSeedSampleData={allTransactions.length === 0 ? handleSeedSampleData : undefined}
              />
            )}

            {currentTab === 'history' && (
              <TransactionListView
                transactions={periodTransactions}
                categories={categories}
                allFunds={allFunds}
                onOpenEntry={handleOpenEntry}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteRequest}
              />
            )}

            {currentTab === 'funds' && (
              <FundsView
                period={period}
                activeFunds={activeFunds}
                archivedFunds={archivedFunds}
                activeSummaries={activeFundSummaries}
                budgetOverview={budgetOverview}
                onCreateFund={handleCreateFund}
                onUpdateFund={handleUpdateFund}
                onUpdateMonthConfig={handleUpdateMonthConfig}
                onArchiveFund={handleArchiveFund}
                onRestoreFund={handleRestoreFund}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                summary={summary}
                transactions={periodTransactions}
                categories={categories}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                totalTransactionsCount={allTransactions.length}
                totalCategoriesCount={categories.length}
                categories={categories}
                onManageCategories={() => setIsCategoryManageOpen(true)}
                onSeedSampleData={allTransactions.length === 0 ? handleSeedSampleData : undefined}
                onResetData={allTransactions.length > 0 ? handleResetData : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenEntry={handleOpenEntry}
      />

      {/* Transaction Entry Modal (Bottom Sheet on Mobile, Dialog on Desktop) */}
      <TransactionEntryModal
        isOpen={isEntryOpen}
        initialType={entryType}
        editingTransaction={editingTransaction}
        categories={categories}
        activeFunds={activeFunds}
        allFunds={allFunds}
        onClose={() => setIsEntryOpen(false)}
        onSave={handleSaveTransaction}
        onCreateCategory={handleCreateCategory}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryManageOpen}
        categories={categories}
        onClose={() => setIsCategoryManageOpen(false)}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onArchiveCategory={handleArchiveCategory}
        onRestoreCategory={handleRestoreCategory}
        onDeleteCategory={handleDeleteCategory}
        getCategoryUsage={getCategoryUsage}
      />

      {/* Delete Confirmation Safeguard */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, txnId: null })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default App;
