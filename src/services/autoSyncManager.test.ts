import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AutoSyncManager,
  getAutoSyncEnabled,
  saveAutoSyncEnabled,
  type AutoSyncState,
} from './autoSyncManager';
import * as googleSheetsSync from './googleSheetsSync';
import * as backupService from './backup';

describe('AutoSyncManager', () => {
  let localStore: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    localStore = {};

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStore[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        localStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete localStore[key];
      }),
      clear: vi.fn(() => {
        localStore = {};
      }),
    };

    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('window', { localStorage: mockLocalStorage });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Configuration persistence', () => {
    it('defaults to true when localStorage is empty', () => {
      expect(getAutoSyncEnabled()).toBe(true);
    });

    it('persists enabled state correctly', () => {
      saveAutoSyncEnabled(false);
      expect(getAutoSyncEnabled()).toBe(false);
      saveAutoSyncEnabled(true);
      expect(getAutoSyncEnabled()).toBe(true);
    });
  });

  describe('Subscription and Listener Notification', () => {
    it('notifies listener immediately upon subscription and on state changes', () => {
      const manager = new AutoSyncManager(1000);
      const states: AutoSyncState[] = [];

      const unsubscribe = manager.subscribe((state) => {
        states.push(state);
      });

      expect(states).toHaveLength(1);
      expect(states[0].status).toBe('idle');

      manager.setAutoSyncEnabled(false);
      expect(states).toHaveLength(2);
      expect(states[1].isAutoSyncEnabled).toBe(false);

      unsubscribe();
      manager.setAutoSyncEnabled(true);
      expect(states).toHaveLength(2); // No new notification after unsubscribe

      manager.destroy();
    });
  });

  describe('Debounce and synchronization execution', () => {
    it('sets status to disabled when credentials are not configured', () => {
      vi.spyOn(googleSheetsSync, 'getSyncConfig').mockReturnValue({
        webAppUrl: '',
        token: '',
      });

      const manager = new AutoSyncManager(1000);
      manager.triggerAutoSync();

      expect(manager.getState().status).toBe('disabled');
      manager.destroy();
    });

    it('debounces rapid trigger calls and executes only once', async () => {
      vi.spyOn(googleSheetsSync, 'getSyncConfig').mockReturnValue({
        webAppUrl: 'https://script.google.com/macros/s/test/exec',
        token: 'token123',
      });

      const mockBackup = {
        $schema: 'https://qlthuchi.local/schemas/v2/backup.json',
        app: 'QL_ThuChi',
        version: 2 as const,
        exportedAt: '2026-10-14T00:00:00.000Z',
        data: { transactions: [], categories: [], funds: [], fundMonthlyConfigs: [] },
      };

      vi.spyOn(backupService, 'generateBackupData').mockResolvedValue(mockBackup);
      const pushSpy = vi.spyOn(googleSheetsSync, 'pushSnapshotToGoogleSheets').mockResolvedValue({
        ok: true,
        action: 'push_snapshot',
        counts: { transactions: 5, categories: 3, funds: 1, fundMonthlyConfigs: 1 },
        syncedAt: '2026-10-14T13:00:00.000Z',
        message: 'Success',
      });

      const manager = new AutoSyncManager(2000);

      // Trigger 3 times in rapid succession
      manager.triggerAutoSync();
      vi.advanceTimersByTime(500);
      manager.triggerAutoSync();
      vi.advanceTimersByTime(500);
      manager.triggerAutoSync();

      // Advance by 1900ms (not yet 2000ms from last trigger)
      vi.advanceTimersByTime(1900);
      expect(pushSpy).not.toHaveBeenCalled();

      // Advance past threshold
      await vi.advanceTimersByTimeAsync(200);

      expect(pushSpy).toHaveBeenCalledOnce();
      expect(manager.getState().status).toBe('synced');
      expect(manager.getState().lastSyncedAt).not.toBeNull();

      manager.destroy();
    });

    it('captures errors gracefully without throwing', async () => {
      vi.spyOn(googleSheetsSync, 'getSyncConfig').mockReturnValue({
        webAppUrl: 'https://script.google.com/macros/s/test/exec',
        token: 'token123',
      });

      vi.spyOn(backupService, 'generateBackupData').mockResolvedValue({
        $schema: '',
        app: '',
        version: 2,
        exportedAt: '',
        data: { transactions: [], categories: [], funds: [], fundMonthlyConfigs: [] },
      });

      vi.spyOn(googleSheetsSync, 'pushSnapshotToGoogleSheets').mockRejectedValue(
        new Error('Network offline or rate limited')
      );

      const manager = new AutoSyncManager(500);
      manager.triggerAutoSync();

      await vi.advanceTimersByTimeAsync(600);

      expect(manager.getState().status).toBe('error');
      expect(manager.getState().lastError).toBe('Network offline or rate limited');

      manager.destroy();
    });

    it('syncNow executes immediately without waiting for debounce timer', async () => {
      vi.spyOn(googleSheetsSync, 'getSyncConfig').mockReturnValue({
        webAppUrl: 'https://script.google.com/macros/s/test/exec',
        token: 'token123',
      });

      vi.spyOn(backupService, 'generateBackupData').mockResolvedValue({
        $schema: '',
        app: '',
        version: 2,
        exportedAt: '',
        data: { transactions: [], categories: [], funds: [], fundMonthlyConfigs: [] },
      });

      const pushSpy = vi.spyOn(googleSheetsSync, 'pushSnapshotToGoogleSheets').mockResolvedValue({
        ok: true,
        action: 'push_snapshot',
        counts: { transactions: 0, categories: 0, funds: 0, fundMonthlyConfigs: 0 },
        syncedAt: '',
        message: '',
      });

      const manager = new AutoSyncManager(5000);
      manager.triggerAutoSync(); // pending timer

      const success = await manager.syncNow(); // immediate

      expect(success).toBe(true);
      expect(pushSpy).toHaveBeenCalledOnce();
      expect(manager.getState().status).toBe('synced');

      // Subsequent timer expiration should not re-trigger
      vi.advanceTimersByTime(6000);
      expect(pushSpy).toHaveBeenCalledOnce();

      manager.destroy();
    });

    it('does nothing when isAutoSyncEnabled is false', () => {
      vi.spyOn(googleSheetsSync, 'getSyncConfig').mockReturnValue({
        webAppUrl: 'https://script.google.com/macros/s/test/exec',
        token: 'token123',
      });

      const pushSpy = vi.spyOn(googleSheetsSync, 'pushSnapshotToGoogleSheets');

      const manager = new AutoSyncManager(500);
      manager.setAutoSyncEnabled(false);
      manager.triggerAutoSync();

      vi.advanceTimersByTime(1000);
      expect(pushSpy).not.toHaveBeenCalled();

      manager.destroy();
    });
  });
});
