import { useState, useEffect, useCallback } from 'react';

export type AppTheme = 'dark' | 'butter-green' | 'pine-butter';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  description: string;
  previewBg: string;
  previewColor: string;
  previewAccent: string;
}

export const THEME_OPTIONS: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'Dark Slate (Mặc định)',
    description: 'Nền tối điềm đạm, chuyên nghiệp, dịu mắt',
    previewBg: '#0B0F19',
    previewColor: '#F8FAFC',
    previewAccent: '#3B82F6',
  },
  {
    id: 'butter-green',
    name: 'Butter & Green (Vintage Sáng)',
    description: 'Nền vàng bơ kem ấm áp và chữ xanh thông sâu',
    previewBg: '#FFEFB3',
    previewColor: '#013E37',
    previewAccent: '#056B4D',
  },
  {
    id: 'pine-butter',
    name: 'Pine & Butter (Vintage Tối)',
    description: 'Nền xanh thông huyền bí và con số vàng bơ nổi bật',
    previewBg: '#013E37',
    previewColor: '#FFEFB3',
    previewAccent: '#2ECC71',
  },
];

const THEME_STORAGE_KEY = 'qlthuchi_app_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
      if (saved && (saved === 'dark' || saved === 'butter-green' || saved === 'pine-butter')) {
        return saved;
      }
    } catch {
      // Fallback to dark
    }
    return 'dark';
  });

  const applyTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    setTheme: applyTheme,
    themes: THEME_OPTIONS,
  };
}
