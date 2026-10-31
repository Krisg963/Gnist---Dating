import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '../types';

const THEME_STORAGE_KEY = 'gnist-theme-mode';

function readInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignore storage read restrictions
  }
  return 'system';
}

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    readInitialThemeMode
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(
    readSystemPrefersDark
  );

  // Listen to OS / Android system dark-mode changes in real time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark);
  const resolvedTheme: 'light' | 'dark' = isDark ? 'dark' : 'light';

  // Sync <html class="dark"> and Android PWA status bar theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#09090B' : '#FAFAFA');
    }
  }, [isDark]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setThemeModeState(nextMode);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  return {
    themeMode,
    resolvedTheme,
    isDark,
    systemPrefersDark,
    setThemeMode,
    toggleDarkMode,
  };
}
