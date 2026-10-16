import type { BackupV2Payload } from './backup';

export interface GoogleSheetsSyncConfig {
  webAppUrl: string;
  token: string;
}

export interface PingResponse {
  ok: boolean;
  action: 'ping';
  duration: number;
  serverTime?: string;
  message?: string;
  code?: string;
  error?: string;
}

export interface InitSheetsResponse {
  ok: boolean;
  action: 'init_sheets';
  createdSheets: string[];
  totalSheets: string[];
  message: string;
  code?: string;
  error?: string;
}

export interface PushSnapshotResponse {
  ok: boolean;
  action: 'push_snapshot';
  counts: {
    transactions: number;
    categories: number;
    funds: number;
    fundMonthlyConfigs: number;
  };
  syncedAt: string;
  message: string;
  code?: string;
  error?: string;
}

export interface PullSnapshotResponse {
  ok: boolean;
  action: 'pull_snapshot';
  data: BackupV2Payload['data'];
  counts: {
    transactions: number;
    categories: number;
    funds: number;
    fundMonthlyConfigs: number;
  };
  pulledAt: string;
  lastSyncedAt?: string;
  message: string;
  code?: string;
  error?: string;
}

export interface GetMetaResponse {
  ok: boolean;
  action: 'get_meta';
  counts: {
    transactions: number;
    categories: number;
    funds: number;
    fundMonthlyConfigs: number;
  };
  lastSyncedAt: string | null;
  schemaVersion: number;
  code?: string;
  error?: string;
}

const STORAGE_KEY_CONFIG = 'qlthuchi_gas_sync_config';

/**
 * Lấy cấu hình Google Apps Script Sync từ localStorage
 */
export function getSyncConfig(): GoogleSheetsSyncConfig {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_WEBAPP_URL) || '';
  const envToken = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_TOKEN) || '';

  if (typeof window === 'undefined' || !window.localStorage) {
    return { webAppUrl: envUrl, token: envToken };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return { webAppUrl: envUrl, token: envToken };
    const parsed = JSON.parse(raw);
    const storedUrl = typeof parsed.webAppUrl === 'string' ? parsed.webAppUrl.trim() : '';
    const storedToken = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    return {
      webAppUrl: storedUrl || envUrl,
      token: storedToken || envToken,
    };
  } catch {
    return { webAppUrl: envUrl, token: envToken };
  }
}

/**
 * Lưu cấu hình Google Apps Script Sync vào localStorage
 */
export function saveSyncConfig(config: GoogleSheetsSyncConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY_CONFIG,
    JSON.stringify({
      webAppUrl: config.webAppUrl.trim(),
      token: config.token.trim(),
    })
  );
}

/**
 * Helper thực hiện request POST tới Google Apps Script Web App
 * Sử dụng text/plain;charset=utf-8 để tránh preflight CORS OPTIONS của trình duyệt
 */
async function sendGasRequest<T>(
  webAppUrl: string,
  payload: Record<string, unknown>
): Promise<T> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    throw new Error('Chưa cấu hình URL của Google Apps Script Web App.');
  }

  if (cleanUrl.includes('docs.google.com/spreadsheets')) {
    throw new Error(
      'URL bạn nhập là link Google Spreadsheet (Trang tính), không phải URL của Google Apps Script Web App! Vui lòng vào Tiện ích mở rộng -> Apps Script -> Triển khai (Deploy) -> Tùy chọn triển khai mới (Web App) để lấy URL /exec.'
    );
  }

  const response = await fetch(cleanUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  let result: T & { ok?: boolean; message?: string; code?: string };
  try {
    result = (await response.json()) as T & { ok?: boolean; message?: string; code?: string };
  } catch {
    throw new Error(
      'Google Apps Script trả về nội dung HTML thay vì JSON. Nguyên nhân thường do quyền truy cập: Khi Deploy Web App, mục "Ai có quyền truy cập" (Who has access) bắt buộc phải chọn "Bất kỳ ai" (Anyone).'
    );
  }

  if (result.ok === false) {
    const errCode = result.code ? `[${result.code}] ` : '';
    throw new Error(`${errCode}${result.message || 'Lỗi thao tác trên Google Apps Script'}`);
  }

  return result;
}

/**
 * Kiểm tra kết nối ping và đo độ trễ round-trip
 */
export async function pingGoogleAppsScript(
  webAppUrl: string,
  token: string
): Promise<PingResponse> {
  const start = performance.now();
  const res = await sendGasRequest<PingResponse>(webAppUrl, {
    action: 'ping',
    token: token.trim(),
    clientTimestamp: Date.now(),
  });
  const duration = Math.round(performance.now() - start);
  return {
    ...res,
    duration,
  };
}

/**
 * Tự động khởi tạo 5 sheet cấu trúc trên Google Spreadsheet
 */
export async function initGoogleSheets(
  webAppUrl: string,
  token: string
): Promise<InitSheetsResponse> {
  return sendGasRequest<InitSheetsResponse>(webAppUrl, {
    action: 'init_sheets',
    token: token.trim(),
  });
}

/**
 * Đẩy toàn bộ dữ liệu Snapshot từ client lên Google Sheets
 */
export async function pushSnapshotToGoogleSheets(
  webAppUrl: string,
  token: string,
  backupData: BackupV2Payload
): Promise<PushSnapshotResponse> {
  return sendGasRequest<PushSnapshotResponse>(webAppUrl, {
    action: 'push_snapshot',
    token: token.trim(),
    data: backupData.data,
    meta: {
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/App',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Tải toàn bộ dữ liệu Snapshot từ Google Sheets về Client
 */
export async function pullSnapshotFromGoogleSheets(
  webAppUrl: string,
  token: string
): Promise<PullSnapshotResponse> {
  return sendGasRequest<PullSnapshotResponse>(webAppUrl, {
    action: 'pull_snapshot',
    token: token.trim(),
  });
}

/**
 * Lấy metadata tóm tắt từ Google Sheets
 */
export async function getGoogleSheetsSyncMeta(
  webAppUrl: string,
  token: string
): Promise<GetMetaResponse> {
  return sendGasRequest<GetMetaResponse>(webAppUrl, {
    action: 'get_meta',
    token: token.trim(),
  });
}
