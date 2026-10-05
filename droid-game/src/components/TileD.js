import React from 'react';

// The Droid "D", the same drawing as the app icon (tools/make-icons.js): a
// 5x5 board with the letter in green tiles and a gold corner tile, like a
// locked hint letter. Empty squares are drawn faintly so it reads as a board.
const D = ['XXXX.', 'X...X', 'X...X', 'X...X', 'XXXX.'];
const TILE = 10;
const GAP = 2;
const STEP = TILE + GAP;
const SIZE = 5 * TILE + 4 * GAP;

export const TileD = ({ className }) => (
  <svg className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
    <defs>
      <linearGradient id="tiled-green" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3ee07f" />
        <stop offset="1" stopColor="#16a34a" />
      </linearGradient>
      <linearGradient id="tiled-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e3cd6a" />
        <stop offset="1" stopColor="#a88f2c" />
      </linearGradient>
    </defs>
    {D.flatMap((row, y) => row.split('').map((c, x) => (
      <rect
        key={`${x}-${y}`}
        x={x * STEP}
        y={y * STEP}
        width={TILE}
        height={TILE}
        rx={1.8}
        fill={c === 'X' ? (x === 0 && y === 0 ? 'url(#tiled-gold)' : 'url(#tiled-green)') : 'rgba(255,255,255,0.06)'}
      />
    )))}
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
