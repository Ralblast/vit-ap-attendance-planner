/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        subtle: 'var(--bg-subtle)',
        'border-faint': 'var(--border-faint)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        inverse: 'var(--text-inverse)',
        success: 'var(--green)',
        warning: 'var(--amber)',
        danger: 'var(--red)',
        'success-dim': 'var(--green-dim)',
        'warning-dim': 'var(--amber-dim)',
        'danger-dim': 'var(--red-dim)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
      boxShadow: {
        card: '0 0 0 1px var(--accent-glow)',
      },
    },
  },
  plugins: [],
};
