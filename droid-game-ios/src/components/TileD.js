import React from 'react';

// The D of the DROID wordmark, built from small green game tiles. It is
// the pixel font's own D - two-tile strokes, rounded right side - because a
// thin one-tile outline (like the app icon's 5x5 board D) reads as a box
// next to the font's bold letters, and the word reads "ROID". The app icon
// (tools/make-icons.js) keeps the 5x5 board D, which works on its own.
const D = [
  'XXXXX..',
  'XXXXXX.',
  'XX..XXX',
  'XX...XX',
  'XX..XXX',
  'XXXXXX.',
  'XXXXX..',
];
const TILE = 10;
const GAP = 1;
const STEP = TILE + GAP;
const SIZE = D.length * TILE + (D.length - 1) * GAP;

export const TileD = ({ className }) => (
  <svg className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
    <defs>
      <linearGradient id="tiled-green" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3ee07f" />
        <stop offset="1" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    {D.flatMap((row, y) => row.split('').map((c, x) => (c === 'X' ? (
      <rect
        key={`${x}-${y}`}
        x={x * STEP}
        y={y * STEP}
        width={TILE}
        height={TILE}
        rx={2}
        fill="url(#tiled-green)"
      />
    ) : null)))}
  </svg>
);

/** "DROID", with the tile-D standing in for the first letter. */
export const Wordmark = () => (
  <div className="home-wordmark" role="img" aria-label="Droid">
    <TileD className="home-wordmark-mark" />
    <span className="home-wordmark-text" aria-hidden="true">ROID</span>
  </div>
);

export default TileD;
