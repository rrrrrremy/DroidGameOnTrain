import React from 'react';

/* Inline stroke icons shared by the home and result screens. They take the
   text colour, so a button's own colour styles them. */

const Stroke = ({ size = 20, width = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const HelpIcon = () => (
  <Stroke>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
  </Stroke>
);

export const ChevronIcon = () => (
  <Stroke size={22}>
    <path d="M9 6l6 6-6 6" />
  </Stroke>
);

export const TrophyIcon = () => (
  <Stroke size={18}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </Stroke>
);

export const CloseIcon = () => (
  <Stroke size={18} width={2.2}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const CheckIcon = () => (
  <Stroke size={14} width={3}>
    <path d="M5 12l5 5L19 7" />
  </Stroke>
);

export const FlameIcon = () => (
  <Stroke size={16} width={2.2}>
    <path d="M12 3c.5 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.3 1.6 1.1 2.6 2 3 0-3 .5-5.5.5-8.5z" />
  </Stroke>
);

/* Solid glyphs for the pause control: bars to pause, a triangle to resume. */
const Solid = ({ size, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {children}
  </svg>
);

export const PauseIcon = ({ size = 22 }) => (
  <Solid size={size}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </Solid>
);

export const PlayIcon = ({ size = 22 }) => (
  <Solid size={size}>
    <path d="M8 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C8.9 3.5 8 4 8 4.8z" />
  </Solid>
);
