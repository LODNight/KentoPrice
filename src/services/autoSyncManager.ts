import {
  getSyncConfig,
  pushSnapshotToGoogleSheets,
  pullSnapshotFromGoogleSheets,
  getGoogleSheetsSyncMeta,
} from './googleSheetsSync';
import { generateBackupData, restoreSnapshotToDatabase } from './backup';

export type AutoSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'disabled';

export interface AutoSyncState {
  status: AutoSyncStatus;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isAutoSyncEnabled: boolean;
  lastPulledAt: Date | null;
}

const STORAGE_KEY_AUTO_SYNC_ENABLED = 'qlthuchi_auto_sync_enabled';
const STORAGE_KEY_LAST_PULLED = 'qlthuchi_last_pulled_at';
const STORAGE_KEY_LAST_CLOUD_SYNCED = 'qlthuchi_last_cloud_synced_at';

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

export function getLastPulledAt(): Date | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const val = window.localStorage.getItem(STORAGE_KEY_LAST_PULLED);
  return val ? new Date(val) : null;
}

export function saveLastPulledAt(date: Date): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY_LAST_PULLED, date.toISOString());
}

export function getLastCloudSyncedAt(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(STORAGE_KEY_LAST_CLOUD_SYNCED);
}

export function saveLastCloudSyncedAt(timestamp: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY_LAST_CLOUD_SYNCED, timestamp);
}

export class AutoSyncManager {
  private debounceMs: number;
  private pullCooldownMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private status: AutoSyncStatus = 'idle';
  private lastSyncedAt: Date | null = null;
  private lastPulledAt: Date | null = null;
  private lastCloudSyncedAt: string | null = null;
  private lastError: string | null = null;
  private isAutoSyncEnabled: boolean;
  private listeners: Set<(state: AutoSyncState) => void> = new Set();
  private dataRestoredListeners: Set<() => void> = new Set();

  constructor(debounceMs = 3000, pullCooldownMs = 120000) {
    this.debounceMs = debounceMs;
    this.pullCooldownMs = pullCooldownMs;
    this.isAutoSyncEnabled = getAutoSyncEnabled();
    this.lastPulledAt = getLastPulledAt();
    this.lastCloudSyncedAt = getLastCloudSyncedAt();
  }

  public getState(): AutoSyncState {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      isAutoSyncEnabled: this.isAutoSyncEnabled,
      lastPulledAt: this.lastPulledAt,
    };
  }

  public subscribe(listener: (state: AutoSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeDataRestored(listener: () => void): () => void {
    this.dataRestoredListeners.add(listener);
    return () => {
      this.dataRestoredListeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  private notifyDataRestored(): void {
    this.dataRestoredListeners.forEach((l) => l());
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

  /**
   * Pushes the current local IndexedDB snapshot to Google Sheets
   */
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
      const res = await pushSnapshotToGoogleSheets(config.webAppUrl, config.token, backupData);

      this.lastSyncedAt = new Date();
      if (res.syncedAt) {
        this.lastCloudSyncedAt = res.syncedAt;
        saveLastCloudSyncedAt(res.syncedAt);
      }
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

  /**
   * Smart Pull from Google Sheets:
   * - Respects TTL cooldown window (default 2 minutes) unless force is true
   * - Checks lightweight metadata before downloading full snapshot
   * - Restores snapshot directly into IndexedDB
   * - Fires data restored callbacks to trigger UI refresh
   */
  public async executePull(options?: { force?: boolean }): Promise<{
    updated: boolean;
    counts?: Record<string, number>;
    error?: string;
  }> {
    if (this.isSyncing) {
      return { updated: false };
    }

    const config = getSyncConfig();
    if (!config.webAppUrl || !config.token) {
      this.status = 'disabled';
      this.notify();
      return { updated: false };
    }

    // 1. Check TTL Cooldown unless forced
    const now = Date.now();
    if (!options?.force && this.lastPulledAt) {
      const elapsed = now - this.lastPulledAt.getTime();
      if (elapsed < this.pullCooldownMs) {
        // Within cooldown window: reuse local-first cached state without network request
        return { updated: false };
      }
    }

    try {
      this.isSyncing = true;
      this.status = 'syncing';
      this.lastError = null;
      this.notify();

      // 2. Lightweight Metadata Check unless forced
      if (!options?.force && this.lastCloudSyncedAt) {
        try {
          const meta = await getGoogleSheetsSyncMeta(config.webAppUrl, config.token);
          if (meta.ok && meta.lastSyncedAt && meta.lastSyncedAt === this.lastCloudSyncedAt) {
            // Cloud has not changed since our last known sync!
            this.lastPulledAt = new Date(now);
            saveLastPulledAt(this.lastPulledAt);
            this.status = 'synced';
            this.notify();
            return { updated: false };
          }
        } catch {
          // Fall through to pull snapshot if meta check is unsupported
        }
      }

      // 3. Pull Snapshot
      const res = await pullSnapshotFromGoogleSheets(config.webAppUrl, config.token);
      if (!res.ok || !res.data) {
        throw new Error(res.error || res.message || 'Không thể tải dữ liệu từ Google Sheets');
      }

      // 4. Restore into IndexedDB
      const restoreResult = await restoreSnapshotToDatabase(res.data);

      this.lastPulledAt = new Date(now);
      saveLastPulledAt(this.lastPulledAt);

      if (res.pulledAt) {
        this.lastCloudSyncedAt = res.pulledAt;
        saveLastCloudSyncedAt(res.pulledAt);
      }

      this.lastSyncedAt = this.lastPulledAt;
      this.status = 'synced';
      this.notify();

      // 5. Notify all components to reload from IndexedDB
      this.notifyDataRestored();

      return { updated: true, counts: restoreResult.counts };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi kéo dữ liệu từ Google Sheets';
      this.lastError = msg;
      this.status = 'error';
      this.notify();
      return { updated: false, error: msg };
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
    this.dataRestoredListeners.clear();
  }
}

// Singleton instance for global background synchronization
export const autoSyncManager = new AutoSyncManager();
