/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme';

const normalizeTheme = value => (value === 'light' ? 'light' : 'dark');

const readInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return normalizeTheme(saved);
  } catch {
    return 'dark';
  }
};

const writeRootTheme = nextTheme => {
  const root = document.documentElement;
  root.classList.add('theme-swap');
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('theme-swap');
    });
  });
};

// Modern browsers (Chrome/Edge/Safari 18+) get a smooth crossfade via the
// View Transitions API; everyone else falls back to the synchronous swap
// with all CSS transitions suppressed for one frame.
const applyTheme = nextTheme => {
  if (typeof document === 'undefined') {
    return;
  }
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => writeRootTheme(nextTheme));
    return;
  }
  writeRootTheme(nextTheme);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (private mode, etc.).
    }
  }, [theme]);

  const setTheme = useCallback(nextTheme => {
    setThemeState(normalizeTheme(nextTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(previous => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
