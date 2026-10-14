import { getSyncConfig, pushSnapshotToGoogleSheets } from './googleSheetsSync';
import { generateBackupData } from './backup';

export type AutoSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'disabled';

export interface AutoSyncState {
  status: AutoSyncStatus;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isAutoSyncEnabled: boolean;
}

const STORAGE_KEY_AUTO_SYNC_ENABLED = 'qlthuchi_auto_sync_enabled';

export function getAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }
  const val = window.localStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED);
  return val === null ? true : val === 'true';
}

export function saveAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, String(enabled));
}

export class AutoSyncManager {
  private debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private status: AutoSyncStatus = 'idle';
  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private isAutoSyncEnabled: boolean;
  private listeners: Set<(state: AutoSyncState) => void> = new Set();

  constructor(debounceMs = 3000) {
    this.debounceMs = debounceMs;
    this.isAutoSyncEnabled = getAutoSyncEnabled();
  }

  public getState(): AutoSyncState {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      isAutoSyncEnabled: this.isAutoSyncEnabled,
    };
  }

  public subscribe(listener: (state: AutoSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public setAutoSyncEnabled(enabled: boolean): void {
    this.isAutoSyncEnabled = enabled;
    saveAutoSyncEnabled(enabled);
    if (!enabled && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.notify();
  }

  public async executeSync(): Promise<boolean> {
    if (this.isSyncing) {
      return false;
    }

    const config = getSyncConfig();
    if (!config.webAppUrl || !config.token) {
      this.status = 'disabled';
      this.notify();
      return false;
    }

    try {
      this.isSyncing = true;
      this.status = 'syncing';
      this.lastError = null;
      this.notify();

      const backupData = await generateBackupData();
      await pushSnapshotToGoogleSheets(config.webAppUrl, config.token, backupData);

      this.lastSyncedAt = new Date();
      this.status = 'synced';
      this.notify();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ ngầm';
      this.lastError = msg;
      this.status = 'error';
      this.notify();
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  public triggerAutoSync(): void {
    if (!this.isAutoSyncEnabled) {
      return;
    }

    const config = getSyncConfig();
    if (!config.webAppUrl || !config.token) {
      this.status = 'disabled';
      this.notify();
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.executeSync();
    }, this.debounceMs);
  }

  public async syncNow(): Promise<boolean> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.executeSync();
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance for global background synchronization
export const autoSyncManager = new AutoSyncManager();
