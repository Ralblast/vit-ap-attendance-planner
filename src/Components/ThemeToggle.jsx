import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-8 w-[58px] items-center rounded-full border border-border-default bg-subtle p-1 transition-colors hover:border-border-strong"
      aria-label="Toggle theme"
    >
      <Motion.div
        animate={{ x: theme === 'dark' ? 0 : 26 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        className="absolute h-6 w-6 rounded-full border border-border-default bg-surface"
      />
      <div className="relative z-10 flex w-full items-center justify-between px-0.5">
        <Moon size={14} className={theme === 'dark' ? 'text-text-primary' : 'text-text-muted'} />
        <Sun size={14} className={theme === 'light' ? 'text-text-primary' : 'text-text-muted'} />
      </div>
    </button>
  );
};

export default ThemeToggle;
