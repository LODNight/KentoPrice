import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSavedTheme, THEME_STORAGE_KEY, THEME_OPTIONS } from './useTheme';

describe('useTheme hook utilities', () => {
  let localStore: Record<string, string> = {};

  beforeEach(() => {
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
    vi.stubGlobal('window', {
      localStorage: mockLocalStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('defaults to dark when localStorage is empty', () => {
    expect(getSavedTheme()).toBe('dark');
  });

  it('reads butter-green from localStorage', () => {
    localStore[THEME_STORAGE_KEY] = 'butter-green';
    expect(getSavedTheme()).toBe('butter-green');
  });

  it('reads pine-butter from localStorage', () => {
    localStore[THEME_STORAGE_KEY] = 'pine-butter';
    expect(getSavedTheme()).toBe('pine-butter');
  });

  it('falls back to dark when an invalid theme is stored', () => {
    localStore[THEME_STORAGE_KEY] = 'neon-pink';
    expect(getSavedTheme()).toBe('dark');
  });

  it('exposes all three supported themes in THEME_OPTIONS', () => {
    const ids = THEME_OPTIONS.map((t) => t.id);
    expect(ids).toContain('dark');
    expect(ids).toContain('butter-green');
    expect(ids).toContain('pine-butter');
  });
});
