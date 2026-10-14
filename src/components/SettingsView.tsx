import React, { useState } from 'react';
import type { Category } from '../types';
import { useTheme, THEME_OPTIONS } from '../hooks/useTheme';
import {
  Palette,
  Database,
  Check,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  ArrowLeft,
  Coins,
  Info,
  CheckCircle2,
  HardDrive,
  Lock,
  Download,
  Loader2,
  Cloud,
  FileSpreadsheet,
  UploadCloud,
  KeyRound,
} from 'lucide-react';
import { exportAndDownloadBackup, generateBackupData } from '../services/backup';
import {
  getSyncConfig,
  saveSyncConfig,
  pingGoogleAppsScript,
  initGoogleSheets,
  pushSnapshotToGoogleSheets,
  getGoogleSheetsSyncMeta,
} from '../services/googleSheetsSync';

interface SettingsViewProps {
  totalTransactionsCount: number;
  totalCategoriesCount: number;
  categories?: Category[];
  onManageCategories?: () => void;
  onSeedSampleData?: () => void;
  onResetData?: () => void;
  onExportBackup?: () => Promise<{ filename: string } | void>;
}

type SettingsSubView = 'theme' | 'data' | 'currency' | 'about' | 'google-sheets' | null;

export const SettingsView: React.FC<SettingsViewProps> = ({
  totalTransactionsCount,
  totalCategoriesCount,
  categories = [],
  onManageCategories,
  onSeedSampleData,
  onResetData,
  onExportBackup,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeSubView, setActiveSubView] = useState<SettingsSubView>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Google Sheets Sync States
  const [syncUrl, setSyncUrl] = useState<string>(() => {
    const cfg = getSyncConfig();
    return cfg.webAppUrl || 'https://script.google.com/macros/s/AKfycbxBWs92JIiRcZvs0yW2BIpjCxwbzP5gnjMLkKnyzt3ICnH8rEBJ58IvSQn_QCdeTSRlIw/exec';
  });
  const [syncToken, setSyncToken] = useState<string>(() => {
    const cfg = getSyncConfig();
    return cfg.token || 'kentoprice123123';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncActionType, setSyncActionType] = useState<'ping' | 'init' | 'push' | 'meta' | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [metaInfo, setMetaInfo] = useState<{ counts?: Record<string, number>; lastSyncedAt?: string | null } | null>(null);


  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setBackupMessage(null);
    try {
      if (onExportBackup) {
        const res = await onExportBackup();
        const filename = res && 'filename' in res ? res.filename : 'backup file';
        setBackupMessage({
          type: 'success',
          text: `Đã xuất sao lưu thành công file ${filename}`,
        });
      } else {
        const { filename } = await exportAndDownloadBackup();
        setBackupMessage({
          type: 'success',
          text: `Đã xuất sao lưu thành công file ${filename}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất file sao lưu thất bại. Vui lòng thử lại.';
      setBackupMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSyncConfig = () => {
    saveSyncConfig({ webAppUrl: syncUrl, token: syncToken });
    setSyncMessage({ type: 'success', text: 'Đã lưu cấu hình Google Apps Script thành công!' });
  };

  const handleTestPing = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncActionType('ping');
    setSyncMessage(null);
    try {
      saveSyncConfig({ webAppUrl: syncUrl, token: syncToken });
      const res = await pingGoogleAppsScript(syncUrl, syncToken);
      setSyncMessage({
        type: 'success',
        text: `Kết nối thành công! Phản hồi từ Google Apps Script trong ${res.duration} ms.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kết nối thất bại';
      setSyncMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncActionType(null);
    }
  };

  const handleInitSheets = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncActionType('init');
    setSyncMessage(null);
    try {
      saveSyncConfig({ webAppUrl: syncUrl, token: syncToken });
      const res = await initGoogleSheets(syncUrl, syncToken);
      setSyncMessage({
        type: 'success',
        text: `Đã khởi tạo thành công ${res.createdSheets.length > 0 ? res.createdSheets.join(', ') : '5 bảng tính'} trên Google Spreadsheet.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Khởi tạo bảng tính thất bại';
      setSyncMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncActionType(null);
    }
  };

  const handlePushSnapshot = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncActionType('push');
    setSyncMessage(null);
    try {
      saveSyncConfig({ webAppUrl: syncUrl, token: syncToken });
      const backupData = await generateBackupData();
      const res = await pushSnapshotToGoogleSheets(syncUrl, syncToken, backupData);
      setSyncMessage({
        type: 'success',
        text: `Đồng bộ hoàn tất: ${res.counts.transactions} giao dịch, ${res.counts.categories} danh mục, ${res.counts.funds} quỹ lên Google Sheets!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đồng bộ thất bại';
      setSyncMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncActionType(null);
    }
  };

  const handleGetMeta = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncActionType('meta');
    setSyncMessage(null);
    try {
      saveSyncConfig({ webAppUrl: syncUrl, token: syncToken });
      const res = await getGoogleSheetsSyncMeta(syncUrl, syncToken);
      setMetaInfo({ counts: res.counts, lastSyncedAt: res.lastSyncedAt });
      setSyncMessage({
        type: 'info',
        text: `Trạng thái: ${res.counts.transactions} giao dịch, ${res.counts.categories} danh mục, ${res.counts.funds} quỹ trên Google Sheets.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lấy thông tin thất bại';
      setSyncMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
      setSyncActionType(null);
    }
  };


  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const expenseCategoriesCount = categories.filter((c) => c.type === 'expense' && !c.isArchived).length;
  const incomeCategoriesCount = categories.filter((c) => c.type === 'income' && !c.isArchived).length;

  // SUB-VIEW 1: Theme Selector
  if (activeSubView === 'theme') {
    return (
      <div className="settings-container">
        {/* Navigation Back Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveSubView(null)}
            style={{ padding: '8px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Chủ đề màu sắc (Theme)</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Chọn tông màu hiển thị phù hợp với phong cách của bạn
            </p>
          </div>
        </div>

        <section className="report-breakdown-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {THEME_OPTIONS.map((item) => {
              const isSelected = theme === item.id;
              return (
                <div
                  key={item.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setTheme(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--color-surface-elevated)' : 'transparent',
                    border: isSelected ? '2px solid var(--color-brand-primary)' : '1px solid var(--color-border-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Visual Color Preview Swatch */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: item.previewBg,
                        border: '1px solid rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: item.previewColor,
                          border: `2px solid ${item.previewAccent}`,
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'transparent',
                      border: isSelected ? 'none' : '2px solid var(--color-border-subtle)',
                      color: '#FFFFFF',
                    }}
                  >
                    {isSelected && <Check size={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // SUB-VIEW 2: Data & Storage
  if (activeSubView === 'data') {
    return (
      <div className="settings-container">
        {/* Navigation Back Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveSubView(null)}
            style={{ padding: '8px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Cơ sở dữ liệu & Lưu trữ</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Quản lý dung lượng lưu trữ cục bộ và công cụ nạp / dọn dẹp dữ liệu
            </p>
          </div>
        </div>

        <section className="report-breakdown-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Database size={20} color="var(--color-brand-primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Tình trạng dữ liệu (IndexedDB)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--color-income)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Cơ sở dữ liệu (IndexedDB)</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-income)' }}>
                Đang hoạt động (ACID Safe)
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            >
              <span>Tổng số giao dịch đã lưu</span>
              <strong className="num" style={{ color: 'var(--color-text-primary)' }}>
                {totalTransactionsCount}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            >
              <span>Số danh mục khả dụng</span>
              <strong className="num" style={{ color: 'var(--color-text-primary)' }}>
                {totalCategoriesCount}
              </strong>
            </div>
          </div>
        </section>

        {/* Backup Export Section (PDR / DATA_CONTRACT v2) */}
        <section className="report-breakdown-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Download size={18} color="var(--color-brand-primary)" />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Sao lưu dữ liệu (JSON v2)</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Xuất toàn bộ giao dịch, danh mục, Quỹ và cấu hình tháng theo hợp đồng dữ liệu v2 thành file JSON an toàn (định dạng: <code>backup_qlthuchi_YYYYMMDD.json</code>).
          </p>

          {backupMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor:
                  backupMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                color:
                  backupMessage.type === 'success'
                    ? 'var(--color-income)'
                    : 'var(--color-expense)',
                border: `1px solid ${
                  backupMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
              }}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : (
                <Info size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.875rem',
              padding: '12px',
              borderColor: 'var(--color-brand-primary)',
              color: 'var(--color-brand-primary)',
            }}
            onClick={handleExportBackup}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xuất dữ liệu sao lưu...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Xuất file sao lưu (JSON v2)</span>
              </>
            )}
          </button>
        </section>

        {/* Action Tools */}
        <section className="report-breakdown-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <HardDrive size={18} color="var(--color-text-secondary)" />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Thao tác dữ liệu mẫu & Đặt lại</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Bạn có thể nạp bộ dữ liệu thử nghiệm để trải nghiệm ngay các biểu đồ báo cáo và dòng tiền, hoặc xóa trắng toàn bộ dữ liệu khi muốn bắt đầu lại từ đầu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {onSeedSampleData && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem', padding: '12px' }}
                onClick={onSeedSampleData}
              >
                <Sparkles size={16} /> Nạp dữ liệu mẫu tháng này
              </button>
            )}
            {onResetData && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  padding: '12px',
                  color: 'var(--color-expense)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
                onClick={onResetData}
              >
                <RefreshCw size={16} /> Xóa trắng dữ liệu (Reset hoàn toàn)
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  // SUB-VIEW 3: Currency & Format Information
  if (activeSubView === 'currency') {
    return (
      <div className="settings-container">
        {/* Navigation Back Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveSubView(null)}
            style={{ padding: '8px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Định dạng & Tiền tệ</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Tiêu chuẩn định dạng tài chính Việt Nam (VND)
            </p>
          </div>
        </div>

        <section className="report-breakdown-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Đơn vị tiền tệ chính</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Việt Nam Đồng (VND)
                </div>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--color-surface)', fontSize: '0.875rem', fontWeight: 700 }}>
                ₫
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Dấu phân cách hàng nghìn</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Định dạng dấu chấm chuẩn Việt Nam (VD: 50.000₫, 1.250.000₫)
                </div>
              </div>
              <span className="num" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-brand-primary)' }}>
                1.000.000₫
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Đọc số tiền thành chữ</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Hỗ trợ phiên dịch số sang tiếng Việt khi nhập tiền
                </div>
              </div>
              <CheckCircle2 size={18} color="var(--color-income)" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // SUB-VIEW 4: About KentoPrice
  if (activeSubView === 'about') {
    return (
      <div className="settings-container">
        {/* Navigation Back Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveSubView(null)}
            style={{ padding: '8px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Về Ứng Dụng KentoPrice</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Ứng dụng quản lý thu chi cá nhân an toàn & riêng tư
            </p>
          </div>
        </div>

        <section className="report-breakdown-card" style={{ marginBottom: '20px', textAlign: 'center', padding: '32px 20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Sparkles size={32} color="#FFFFFF" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>KentoPrice</h2>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Phiên bản 1.0.0 (Build 2026)
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            KentoPrice là ứng dụng quản lý thu chi cá nhân hiện đại, tốc độ cao với nguyên tắc cốt lõi: <strong>Đơn giản, Nhanh dưới 5 giây, Bảo mật dữ liệu tuyệt đối</strong>.
          </p>
        </section>

        <section className="report-breakdown-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0' }}>
              <Lock size={20} color="var(--color-income)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>100% Cục bộ & Riêng tư (Offline-first)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                  Dữ liệu tài chính của bạn được lưu hoàn toàn trong trình duyệt (IndexedDB ACID Safe), không gửi lên bất kỳ máy chủ bên thứ ba nào.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--color-border-subtle)' }}>
              <Sparkles size={20} color="var(--color-brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Hiệu năng cao & Mượt mà</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                  Xây dựng trên nền tảng React 19, TypeScript và Vite, đảm bảo mọi thao tác ghi nhận đều hoàn tất ngay tức thì.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // SUB-VIEW: Google Sheets Cloud Sync
  if (activeSubView === 'google-sheets') {
    return (
      <div className="settings-container">
        {/* Navigation Back Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setActiveSubView(null);
              setSyncMessage(null);
            }}
            aria-label="Quay lại danh mục cài đặt"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Đồng Bộ Google Sheets</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Sao lưu đám mây an toàn & kiểm soát dữ liệu trên bảng tính cá nhân
            </p>
          </div>
        </div>

        {syncMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor:
                syncMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : syncMessage.type === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
              color:
                syncMessage.type === 'success'
                  ? 'var(--color-income)'
                  : syncMessage.type === 'error'
                  ? 'var(--color-expense)'
                  : 'var(--color-brand-primary)',
              border: `1px solid ${
                syncMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : syncMessage.type === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)'
              }`,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {syncMessage.type === 'success' ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            ) : syncMessage.type === 'error' ? (
              <Info size={18} style={{ flexShrink: 0 }} />
            ) : (
              <Cloud size={18} style={{ flexShrink: 0 }} />
            )}
            <span style={{ fontWeight: 500 }}>{syncMessage.text}</span>
          </div>
        )}

        {/* Section 1: Cấu hình Web App URL & Token */}
        <section className="report-breakdown-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} color="var(--color-brand-primary)" />
            Cấu hình Kết nối Google Apps Script
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                URL Ứng dụng web (Web App URL)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                style={{ width: '100%', fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                Mã bí mật xác thực (Shared Secret Token)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ví dụ: kentoprice123123"
                value={syncToken}
                onChange={(e) => setSyncToken(e.target.value)}
                style={{ width: '100%', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveSyncConfig}
                style={{ fontSize: '0.8125rem', padding: '8px 14px' }}
              >
                Lưu cấu hình
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTestPing}
                disabled={isSyncing}
                style={{ fontSize: '0.8125rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSyncing && syncActionType === 'ping' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Kiểm tra kết nối (Ping)
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Quản lý Bảng Tính & Đồng Bộ Dữ Liệu */}
        <section className="report-breakdown-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} color="var(--color-income)" />
            Thao tác Đồng bộ Bảng tính
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Action 1: Khởi tạo bảng tính */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>1. Khởi tạo 5 bảng tính</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Tạo các tab Transactions, Categories, Funds, FundMonthlyConfigs, Sync_Meta
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleInitSheets}
                disabled={isSyncing}
                style={{ fontSize: '0.8125rem', padding: '6px 12px', flexShrink: 0 }}
              >
                {isSyncing && syncActionType === 'init' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Khởi tạo'
                )}
              </button>
            </div>

            {/* Action 2: Đẩy toàn bộ dữ liệu (Push Snapshot) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>2. Đẩy dữ liệu lên Google Sheets (Push)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Sao lưu toàn bộ giao dịch, danh mục, quỹ và hạn mức hiện có lên Cloud
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePushSnapshot}
                disabled={isSyncing}
                style={{ fontSize: '0.8125rem', padding: '6px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSyncing && syncActionType === 'push' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                Đẩy ngay
              </button>
            </div>

            {/* Action 3: Xem thông tin bảng tính */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>3. Kiểm tra số lượng bản ghi trên Cloud</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {metaInfo?.counts
                    ? `${metaInfo.counts.transactions} giao dịch • ${metaInfo.counts.categories} danh mục • ${metaInfo.counts.funds} quỹ`
                    : 'Đọc số lượng dòng hiện tại từ Google Sheets'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGetMeta}
                disabled={isSyncing}
                style={{ fontSize: '0.8125rem', padding: '6px 12px', flexShrink: 0 }}
              >
                {isSyncing && syncActionType === 'meta' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Kiểm tra'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Hướng dẫn kỹ thuật */}
        <section className="report-breakdown-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Info size={18} color="var(--color-brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <strong>Lưu ý:</strong> Để sử dụng các chức năng đồng bộ Bước 3 (Khởi tạo, Push, Pull), hãy cập nhật mã nguồn <code>sync_backend.gs</code> vào file <code>Code.gs</code> trong Google Apps Script của bạn và triển khai phiên bản mới (Deploy &gt; Manage deployments &gt; New version).
            </div>
          </div>
        </section>
      </div>
    );
  }

  // MAIN VIEW: Grouped Settings Directory
  return (

    <div className="settings-container">
      {/* Settings Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Cài Đặt</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Tùy chỉnh giao diện, cấu hình danh mục và quản lý dữ liệu lưu trữ
        </p>
      </div>

      {backupMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor:
              backupMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            color:
              backupMessage.type === 'success'
                ? 'var(--color-income)'
                : 'var(--color-expense)',
            border: `1px solid ${
              backupMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {backupMessage.type === 'success' ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          ) : (
            <Info size={18} style={{ flexShrink: 0 }} />
          )}
          <span style={{ fontWeight: 500 }}>{backupMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* GROUP 1: Giao diện & Hiển thị */}
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              paddingLeft: '4px',
            }}
          >
            Giao diện & Hiển thị
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Item 1.1: Theme */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveSubView('theme')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366F1',
                    flexShrink: 0,
                  }}
                >
                  <Palette size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Chủ đề màu sắc
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {currentThemeObj.name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: currentThemeObj.previewColor,
                    border: `2px solid ${currentThemeObj.previewAccent}`,
                  }}
                  title={currentThemeObj.name}
                />
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 2: Quản lý Thu Chi */}
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              paddingLeft: '4px',
            }}
          >
            Quản lý Thu Chi & Danh mục
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Item 2.1: Custom Categories */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onManageCategories && onManageCategories()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Danh mục Thu & Chi
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {expenseCategoriesCount} mục chi • {incomeCategoriesCount} mục thu
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge" style={{ backgroundColor: 'var(--color-surface-elevated)', fontSize: '0.75rem' }}>
                  Tùy chỉnh
                </span>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            </div>

            {/* Item 2.2: Currency & Formatting */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveSubView('currency')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                    flexShrink: 0,
                  }}
                >
                  <Coins size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Đơn vị tiền tệ & Định dạng
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Việt Nam Đồng (₫)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="num" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  1.000.000₫
                </span>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: Dữ liệu & Lưu trữ */}
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              paddingLeft: '4px',
            }}
          >
            Dữ liệu & Lưu trữ
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Item 3.1: Database & Storage Status */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveSubView('data')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                    flexShrink: 0,
                  }}
                >
                  <Database size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Cơ sở dữ liệu & Lưu trữ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {totalTransactionsCount} giao dịch • IndexedDB ACID Safe
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-income)', fontSize: '0.75rem' }}>
                  An toàn
                </span>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            </div>

            {/* Item 3.2: Direct Backup Export (JSON v2) */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleExportBackup}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transition: 'background-color var(--transition-fast)',
                borderTop: '1px solid var(--color-border-subtle)',
                opacity: isExporting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)';
              }}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-income)',
                    flexShrink: 0,
                  }}
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Sao lưu dữ liệu (JSON v2)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Xuất file JSON an toàn: backup_qlthuchi_YYYYMMDD.json
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    color: 'var(--color-brand-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {isExporting ? 'Đang xuất...' : 'Xuất ngay'}
                </span>
                <Download size={16} color="var(--color-text-muted)" />
              </div>
            </div>

            {/* Item 3.3: Google Sheets Cloud Sync */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveSubView('google-sheets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
                borderTop: '1px solid var(--color-border-subtle)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand-primary)',
                    flexShrink: 0,
                  }}
                >
                  <Cloud size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Đồng bộ Google Sheets
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Tự động sao lưu & đồng bộ 5 bảng tính qua Google Apps Script
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: 'var(--color-brand-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Đám mây
                </span>
                <ChevronRight size={18} color="var(--color-text-muted)" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 4: Thông tin hệ thống */}
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              paddingLeft: '4px',
            }}
          >
            Hệ thống & Thông tin
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Item 4.1: About */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveSubView('about')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(100, 116, 139, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <Info size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Thông tin ứng dụng
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    KentoPrice v1.0 • 100% Offline-first
                  </div>
                </div>
              </div>

              <ChevronRight size={18} color="var(--color-text-muted)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
