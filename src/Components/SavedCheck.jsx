import React from 'react';

// Single source for the "Saved" confirmation glyph used across the app.
// Hand-tuned thin stroke + tight viewBox so it reads as a UI checkmark
// rather than the bolder lucide `Check` (which felt heavier and more
// "auto-generated" in muted UI contexts). Inherits currentColor so the
// hosting span/button can drive its tone via Tailwind colour classes.
const SavedCheck = ({ size = 11, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2.5 6.25 5 8.75 9.5 3.5" />
  </svg>
);

export default SavedCheck;
