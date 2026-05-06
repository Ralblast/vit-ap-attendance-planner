import React from 'react';

// Single source for the success / warning / danger verdict glyphs used
// in tiles, tables, and row verdicts across the app. Hand-tuned thin
// strokes (1.75px on a 12×12 viewBox) so they read as UI marks rather
// than the chunky native emoji rendering of ✅ / ⚠ / ❌. Inherits
// currentColor — the hosting element drives the tone via Tailwind
// colour classes (text-success, text-warning, text-danger, etc).
const StatusGlyph = ({ tone = 'success', size = 12, className = '' }) => {
  const baseProps = {
    width: size,
    height: size,
    viewBox: '0 0 12 12',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  };

  if (tone === 'warning') {
    return (
      <svg {...baseProps}>
        {/* Equilateral-ish triangle */}
        <path d="M6 1.75 L10.5 10 L1.5 10 Z" />
        {/* Exclamation stem */}
        <path d="M6 5 V7" />
        {/* Exclamation dot — short segment so it scales cleanly */}
        <path d="M6 8.6 V8.7" />
      </svg>
    );
  }

  if (tone === 'danger') {
    return (
      <svg {...baseProps}>
        <path d="M3 3 L9 9" />
        <path d="M9 3 L3 9" />
      </svg>
    );
  }

  // success — thin check mark, no surrounding box
  return (
    <svg {...baseProps}>
      <path d="M2.5 6.25 L5 8.75 L9.5 3.5" />
    </svg>
  );
};

export default StatusGlyph;
