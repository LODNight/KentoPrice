import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSyncConfig,
  saveSyncConfig,
  pingGoogleAppsScript,
  initGoogleSheets,
  pushSnapshotToGoogleSheets,
  pullSnapshotFromGoogleSheets,
  getGoogleSheetsSyncMeta,
} from './googleSheetsSync';
import type { BackupV2Payload } from './backup';

describe('googleSheetsSync service', () => {
  const dummyUrl = 'https://script.google.com/macros/s/test_exec/exec';
  const dummyToken = 'test_token_secret_123';

  let localStore: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
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
    vi.stubEnv('VITE_GAS_WEBAPP_URL', '');
    vi.stubEnv('VITE_GAS_TOKEN', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('Configuration persistence (localStorage)', () => {
    it('returns empty config if localStorage is empty', () => {
      const config = getSyncConfig();
      expect(config).toEqual({ webAppUrl: '', token: '' });
    });

    it('saves and loads trimmed config correctly', () => {
      saveSyncConfig({
        webAppUrl: '  https://script.google.com/test  ',
        token: '  my_token_123  ',
      });
      const config = getSyncConfig();
      expect(config).toEqual({
        webAppUrl: 'https://script.google.com/test',
        token: 'my_token_123',
      });
    });

    it('handles corrupted localStorage JSON without crashing', () => {
      localStore['qlthuchi_gas_sync_config'] = '{ corrupted: json';
      const config = getSyncConfig();
      expect(config).toEqual({ webAppUrl: '', token: '' });
    });
  });

  describe('pingGoogleAppsScript', () => {
    it('sends action ping with token and calculates duration', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          action: 'ping',
          serverTime: '2026-10-14T13:00:00.000Z',
          message: 'Pong!',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await pingGoogleAppsScript(dummyUrl, dummyToken);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [calledUrl, options] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe(dummyUrl);
      expect(options.method).toBe('POST');
      expect(options.redirect).toBe('follow');
      expect(options.headers['Content-Type']).toBe('text/plain;charset=utf-8');

      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.action).toBe('ping');
      expect(parsedBody.token).toBe(dummyToken);

      expect(result.ok).toBe(true);
      expect(result.action).toBe('ping');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('throws error when server responds with ok: false', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: false,
          code: 'ERR_UNAUTHORIZED',
          message: 'Token xác thực không hợp lệ',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(pingGoogleAppsScript(dummyUrl, 'wrong_token')).rejects.toThrow(
        '[ERR_UNAUTHORIZED] Token xác thực không hợp lệ'
      );
    });

    it('throws error when URL is empty', async () => {
      await expect(pingGoogleAppsScript('', dummyToken)).rejects.toThrow(
        'Chưa cấu hình URL của Google Apps Script Web App.'
      );
    });

    it('throws error on network or HTTP 500 failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(pingGoogleAppsScript(dummyUrl, dummyToken)).rejects.toThrow(
        'HTTP Error 500: Internal Server Error'
      );
    });
  });

  describe('initGoogleSheets', () => {
    it('sends action init_sheets and returns created sheet list', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          action: 'init_sheets',
          createdSheets: ['Transactions', 'Categories', 'Funds', 'FundMonthlyConfigs', 'Sync_Meta'],
          totalSheets: ['Transactions', 'Categories', 'Funds', 'FundMonthlyConfigs', 'Sync_Meta'],
          message: 'Khởi tạo thành công',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await initGoogleSheets(dummyUrl, dummyToken);

      expect(res.ok).toBe(true);
      expect(res.createdSheets).toHaveLength(5);
    });
  });

  describe('pushSnapshotToGoogleSheets', () => {
    it('sends backup payload in action push_snapshot and receives sync confirmation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          action: 'push_snapshot',
          counts: {
            transactions: 10,
            categories: 5,
            funds: 2,
            fundMonthlyConfigs: 3,
          },
          syncedAt: '2026-10-14T13:30:00.000Z',
          message: 'Đã lưu trữ an toàn',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const dummyBackup: BackupV2Payload = {
        $schema: 'https://qlthuchi.local/schemas/v2/backup.json',
        app: 'QL_ThuChi',
        version: 2,
        exportedAt: '2026-10-14T13:00:00.000Z',
        data: {
          transactions: [],
          categories: [],
          funds: [],
          fundMonthlyConfigs: [],
        },
      };

      const res = await pushSnapshotToGoogleSheets(dummyUrl, dummyToken, dummyBackup);

      expect(res.ok).toBe(true);
      expect(res.counts.transactions).toBe(10);
      expect(res.syncedAt).toBe('2026-10-14T13:30:00.000Z');
    });
  });

  describe('pullSnapshotFromGoogleSheets', () => {
    it('sends pull_snapshot and receives full dataset', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          action: 'pull_snapshot',
          data: {
            transactions: [
              {
                id: 'txn_1',
                type: 'expense',
                amount: 30000,
                categoryId: 'cat_coffee',
                transactionDate: '2026-10-14',
                createdAt: '2026-10-14T01:00:00.000Z',
                updatedAt: '2026-10-14T01:00:00.000Z',
              },
            ],
            categories: [],
            funds: [],
            fundMonthlyConfigs: [],
          },
          counts: { transactions: 1, categories: 0, funds: 0, fundMonthlyConfigs: 0 },
          pulledAt: '2026-10-14T13:35:00.000Z',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await pullSnapshotFromGoogleSheets(dummyUrl, dummyToken);

      expect(res.ok).toBe(true);
      expect(res.data.transactions).toHaveLength(1);
      expect(res.data.transactions[0].id).toBe('txn_1');
    });
  });

  describe('getGoogleSheetsSyncMeta', () => {
    it('sends get_meta and receives record counts and last sync timestamp', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          action: 'get_meta',
          counts: {
            transactions: 42,
            categories: 16,
            funds: 3,
            fundMonthlyConfigs: 6,
          },
          lastSyncedAt: '2026-10-14T13:20:00.000Z',
          schemaVersion: 2,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await getGoogleSheetsSyncMeta(dummyUrl, dummyToken);

      expect(res.ok).toBe(true);
      expect(res.counts.transactions).toBe(42);
      expect(res.lastSyncedAt).toBe('2026-10-14T13:20:00.000Z');
      expect(res.schemaVersion).toBe(2);
    });
  });
});
