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

// Battle-tested pattern from next-themes: inject a stylesheet that kills
// every CSS *transition* (animations stay alive so framer-motion still
// works), force a synchronous reflow so the browser commits that style
// BEFORE the data-theme change paints, swap the attribute, then remove
// the stylesheet on the next macrotask.
const applyTheme = nextTheme => {
  if (typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{transition:none !important;}'
    )
  );
  document.head.appendChild(style);

  const root = document.documentElement;
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  // Force the browser to commit the disabled-transition styles synchronously
  // before the next paint. Reading a layout property triggers a reflow.
  const _force = window.getComputedStyle(document.body).opacity;
  void _force;

  setTimeout(() => {
    style.remove();
  }, 0);
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
