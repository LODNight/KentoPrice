import {
  getSyncConfig,
  pushSnapshotToGoogleSheets,
  pullSnapshotFromGoogleSheets,
  getGoogleSheetsSyncMeta,
} from './googleSheetsSync';
import { generateBackupData, restoreSnapshotToDatabase } from './backup';
import { broadcastSyncRestored } from './crossTabSync';

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
  private metaThrottleMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private isPulling = false;
  private postPullGuardTimer: ReturnType<typeof setTimeout> | null = null;
  private status: AutoSyncStatus = 'idle';
  private lastSyncedAt: Date | null = null;
  private lastPulledAt: Date | null = null;
  private lastCloudSyncedAt: string | null = null;
  private lastError: string | null = null;
  private isAutoSyncEnabled: boolean;
  private listeners: Set<(state: AutoSyncState) => void> = new Set();
  private dataRestoredListeners: Set<() => void> = new Set();

  constructor(debounceMs = 3000, metaThrottleMs = 2500) {
    this.debounceMs = debounceMs;
    this.metaThrottleMs = metaThrottleMs;
    this.isAutoSyncEnabled = getAutoSyncEnabled();
    this.lastPulledAt = getLastPulledAt();
    this.lastCloudSyncedAt = getLastCloudSyncedAt();

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  private handleOnline = (): void => {
    if (this.isAutoSyncEnabled) {
      this.triggerAutoSync();
    }
  };

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
    if (this.isSyncing || this.isPulling) {
      return false;
    }

    const config = getSyncConfig();
    if (!config.webAppUrl || !config.token) {
      this.status = 'disabled';
      this.notify();
      return false;
    }

    // If offline, do not attempt network request or display error badge
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }

    try {
      this.isSyncing = true;
      this.status = 'syncing';
      this.lastError = null;
      this.notify();

      // CONFLICT SAFEGUARD: Before overwriting cloud, verify cloud does not have newer changes from another device!
      if (this.lastCloudSyncedAt) {
        try {
          const meta = await getGoogleSheetsSyncMeta(config.webAppUrl, config.token);
          if (meta.ok && meta.lastSyncedAt && meta.lastSyncedAt !== this.lastCloudSyncedAt) {
            console.warn(
              '[AutoSync] Phát hiện dữ liệu mới hơn trên Cloud từ thiết bị khác. Hủy push và thực hiện kéo về trước để tránh mất dữ liệu!'
            );
            this.isSyncing = false;
            await this.executePull({ force: true });
            return false;
          }
        } catch {
          // If offline / network error checking meta, proceed with push
        }
      }

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
   * - Respects lightweight throttle (2.5 seconds) to prevent rapid event double-firing
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

    // Cancel any pending auto-push debounce timer before pulling to prevent stale push race conditions
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const now = Date.now();

    // 1. Throttle: avoid spamming get_meta within metaThrottleMs (prevents focus + visibilitychange rapid double-firing)
    const withinMetaThrottle =
      !options?.force && this.lastPulledAt && now - this.lastPulledAt.getTime() < this.metaThrottleMs;

    if (withinMetaThrottle) {
      // Too soon since last pull check — skip to avoid duplicate concurrent calls
      return { updated: false };
    }

    try {
      this.isPulling = true;
      this.isSyncing = true;
      this.status = 'syncing';
      this.lastError = null;
      this.notify();

      let cloudLastSyncedAt: string | null = null;

      // 2. Always do lightweight Metadata Check first (unless forced)
      //    This ensures cross-device sync: if another browser pushed new data,
      //    this will detect it immediately and download full snapshot.
      if (!options?.force && this.lastCloudSyncedAt) {
        try {
          const meta = await getGoogleSheetsSyncMeta(config.webAppUrl, config.token);
          if (meta.ok && meta.lastSyncedAt) {
            cloudLastSyncedAt = meta.lastSyncedAt;
            if (meta.lastSyncedAt === this.lastCloudSyncedAt) {
              // ✅ Cloud unchanged since our last sync — skip full download
              this.lastPulledAt = new Date(now);
              saveLastPulledAt(this.lastPulledAt);
              this.status = 'synced';
              this.notify();
              return { updated: false };
            }
            // ℹ️ Cloud has newer data → fall through to full pull
          }
        } catch {
          // Network error on meta check → fall through to full pull attempt
        }
      }

      // 3. Pull full Snapshot from cloud
      const res = await pullSnapshotFromGoogleSheets(config.webAppUrl, config.token);
      if (!res.ok || !res.data) {
        throw new Error(res.error || res.message || 'Không thể tải dữ liệu từ Google Sheets');
      }

      // 4. Restore into IndexedDB
      const restoreResult = await restoreSnapshotToDatabase(res.data);

      this.lastPulledAt = new Date(now);
      saveLastPulledAt(this.lastPulledAt);

      const targetCloudSyncedAt = cloudLastSyncedAt || res.lastSyncedAt || res.pulledAt;
      if (targetCloudSyncedAt) {
        this.lastCloudSyncedAt = targetCloudSyncedAt;
        saveLastCloudSyncedAt(targetCloudSyncedAt);
      }

      this.lastSyncedAt = this.lastPulledAt;
      this.status = 'synced';
      this.notify();

      // 5. Notify all components to reload from IndexedDB
      this.notifyDataRestored();
      broadcastSyncRestored();

      return { updated: true, counts: restoreResult.counts };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi kéo dữ liệu từ Google Sheets';
      this.lastError = msg;
      this.status = 'error';
      this.notify();
      return { updated: false, error: msg };
    } finally {
      this.isSyncing = false;
      // Keep isPulling = true for a brief window so that state-change side effects
      // triggered by restoreSnapshotToDatabase() do NOT immediately push back to GSheets
      if (this.postPullGuardTimer) clearTimeout(this.postPullGuardTimer);
      this.postPullGuardTimer = setTimeout(() => {
        this.isPulling = false;
        this.postPullGuardTimer = null;
      }, 5000); // 5-second post-pull guard window
    }
  }

  public triggerAutoSync(): void {
    if (!this.isAutoSyncEnabled) {
      return;
    }

    // Guard: suppress auto-push triggered by state changes that are side effects of a Pull
    // (e.g., restoreSnapshotToDatabase → reloadCategories → useEffect → triggerAutoSync)
    if (this.isPulling) {
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
    if (this.postPullGuardTimer) {
      clearTimeout(this.postPullGuardTimer);
      this.postPullGuardTimer = null;
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('online', this.handleOnline);
    }
    this.isPulling = false;
    this.listeners.clear();
    this.dataRestoredListeners.clear();
  }
}

// Singleton instance for global background synchronization
export const autoSyncManager = new AutoSyncManager();
