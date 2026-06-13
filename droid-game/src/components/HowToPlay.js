import React from 'react';

// Small 5×5 board diagram. `cells` is an array of 25 entries; each is either
// null (gap, not part of the shape) or { l, t } where l = letter and t = tile
// type ('hint' | 'correct' | 'wrong' | 'filled' | 'empty').
const MiniBoard = ({ cells }) => (
  <div className="htp-mini-board" aria-hidden="true">
    {cells.map((cell, i) =>
      cell === null ? (
        <span key={i} className="htp-cell htp-cell-gap" />
      ) : (
        <span key={i} className={`htp-cell htp-cell-${cell.t}`}>{cell.l || ''}</span>
      )
    )}
  </div>
);

// Build a 5×5 from a 5-line string template. '.' = gap, ' ' = empty active tile.
// Otherwise the char is the letter; a type map keys off coordinates.
const grid = (rows, typeFor) =>
  rows.flatMap((row, y) =>
    row.split('').map((ch, x) => {
      if (ch === '.') return null;
      const t = typeFor ? typeFor(x, y, ch) : 'filled';
      if (t === null) return null;
      return { l: ch === ' ' ? '' : ch, t };
    })
  );

// A real word square — every row AND column spells the same set of words:
// HEART / EMBER / ABUSE / RESIN / TREND. This is the goal board.
const WORDS = ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'];

const GOAL = grid(WORDS, () => 'filled');

// What the solver starts with: a couple of gold hint tiles, rest empty
const START = grid(
  ['H    ', '     ', '  U  ', '     ', '    D'],
  (x, y, ch) => (ch !== ' ' ? 'hint' : 'empty')
);

// After submitting: greens for correct, one grey wrong
const SOLVED = grid(WORDS, (x, y) => (x === 4 && y === 3 ? 'wrong' : 'correct'));

const HowToPlay = ({ onClose }) => (
  <div className="htp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="htp-modal" role="dialog" aria-label="How to play Droid">
      <div className="htp-topbar">
        <h2 className="htp-title">How to Play</h2>
        <button className="htp-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="htp-scroll">
        {/* The goal */}
        <section className="htp-hero">
          <MiniBoard cells={GOAL} />
          <div className="htp-hero-copy">
            <span className="htp-kicker">The Goal</span>
            <p>
              Rebuild the hidden word grid. Every <strong>row</strong> and every{' '}
              <strong>column</strong> must spell a real word.
            </p>
          </div>
        </section>

        {/* Steps */}
        <div className="htp-steps">
          <div className="htp-step">
            <div className="htp-step-num">1</div>
            <MiniBoard cells={GOAL} />
            <div className="htp-step-text">
              <strong>Take a look</strong>
              <span>During Reading Time the full board is shown. Memorise the words.</span>
            </div>
          </div>

          <div className="htp-step">
            <div className="htp-step-num">2</div>
            <MiniBoard cells={START} />
            <div className="htp-step-text">
              <strong>The board clears</strong>
              <span>A few gold hint tiles stay locked in place. You also get the pool of letters that were used.</span>
            </div>
          </div>

          <div className="htp-step">
            <div className="htp-step-num">3</div>
            <MiniBoard cells={SOLVED} />
            <div className="htp-step-text">
              <strong>Put it back together</strong>
              <span>Drag or tap letters into the grid, then Submit. Correct tiles turn green.</span>
            </div>
          </div>
        </div>

        {/* Tile key */}
        <section className="htp-section">
          <h3 className="htp-h3">Tile Colours</h3>
          <div className="htp-key">
            <div className="htp-key-item"><span className="htp-swatch htp-cell-hint">A</span> Hint — free &amp; locked</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-filled">B</span> Letter you placed</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-correct">C</span> Correct</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-wrong">D</span> Wrong</div>
          </div>
        </section>

        {/* Rules */}
        <section className="htp-section">
          <h3 className="htp-h3">Rules</h3>
          <ul className="htp-rules">
            <li>Words must fill the <strong>entire</strong> row or column — no partial words.</li>
            <li>You can only use letters from the pool shown.</li>
            <li>Stuck? Reveal-a-letter hints help, but each one costs you points.</li>
            <li>Finish faster and use fewer hints for a higher score.</li>
          </ul>
        </section>

        {/* Modes */}
        <section className="htp-section">
          <h3 className="htp-h3">Game Modes</h3>
          <div className="htp-modes">
            <div className="htp-mode">
              <strong>Droid v Human</strong>
              <span>The daily challenge against the AI. Compete on the leaderboard.</span>
            </div>
            <div className="htp-mode">
              <strong>Human v Human</strong>
              <span>One friend builds a board, the other rebuilds it.</span>
            </div>
            <div className="htp-mode">
              <strong>Ghost Droid</strong>
              <span>Letters appear one at a time — place each as it arrives.</span>
            </div>
            <div className="htp-mode htp-mode-lightning">
              <strong>⚡ Play Any Shape</strong>
              <span>Pay 1,000 sats to play any shape against the Droid.</span>
            </div>
          </div>
        </section>
      </div>

      <button className="button primary htp-got-it" onClick={onClose}>Got it</button>
    </div>
  </div>
);

export default HowToPlay;
