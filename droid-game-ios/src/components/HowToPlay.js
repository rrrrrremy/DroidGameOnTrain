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

// A real word square — every row AND column spells a word:
// HEART / EMBER / ABUSE / RESIN / TREND. This is the answer, which the
// player never sees until the round is over.
const WORDS = ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'];

const GOAL = grid(WORDS, () => 'filled');

// What you actually start with: two locked letters, everything else empty.
const START = grid(
  ['H    ', '     ', '  U  ', '     ', '     '],
  (x, y, ch) => (ch !== ' ' ? 'hint' : 'empty')
);

// Mid-solve: a few letters placed from the pool, the rest still to go.
const WORKING = grid(
  ['HEART', '     ', '  U  ', '     ', '     '],
  (x, y, ch) => {
    if (ch === ' ') return 'empty';
    if ((x === 0 && y === 0) || (x === 2 && y === 2)) return 'hint';
    return 'filled';
  }
);

// After submitting: greens for correct, one grey wrong
const SOLVED = grid(WORDS, (x, y) => (x === 4 && y === 3 ? 'wrong' : 'correct'));

const HowToPlay = ({ onClose, hideLightning = false }) => (
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
              Work out the hidden word grid. Every <strong>row</strong> and every{' '}
              <strong>column</strong> must spell a real word.
            </p>
          </div>
        </section>

        {/* Steps */}
        <div className="htp-steps">
          <div className="htp-step">
            <div className="htp-step-num">1</div>
            <MiniBoard cells={START} />
            <div className="htp-step-text">
              <strong>Two letters, and a pool</strong>
              <span>
                The Droid builds a grid, then takes it away — leaving just two
                gold letters locked in place. Every other letter it used is
                waiting in the pool below the board.
              </span>
            </div>
          </div>

          <div className="htp-step">
            <div className="htp-step-num">2</div>
            <MiniBoard cells={WORKING} />
            <div className="htp-step-text">
              <strong>Work out where they go</strong>
              <span>
                Tap a letter, then tap a tile to place it. Nothing is hidden
                from you — it's a puzzle, not a memory test. Use the two locked
                letters and the crossings between words to reason out the rest.
              </span>
            </div>
          </div>

          <div className="htp-step">
            <div className="htp-step-num">3</div>
            <MiniBoard cells={SOLVED} />
            <div className="htp-step-text">
              <strong>Submit your grid</strong>
              <span>
                Fill every tile, then Submit. If a word isn't real the grid
                comes back so you can keep working — nothing is lost but time.
                You don't have to match the Droid exactly: any grid where every
                word is real counts as solved, and scores the same.
              </span>
            </div>
          </div>
        </div>

        {/* Tile key */}
        <section className="htp-section">
          <h3 className="htp-h3">Tile Colours</h3>
          <div className="htp-key">
            <div className="htp-key-item"><span className="htp-swatch htp-cell-hint">A</span> Locked — free, can't be moved</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-filled">B</span> Letter you placed</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-correct">C</span> Matches the Droid</div>
            <div className="htp-key-item"><span className="htp-swatch htp-cell-wrong">D</span> Different from the Droid</div>
          </div>
        </section>

        {/* Rules */}
        <section className="htp-section">
          <h3 className="htp-h3">Rules</h3>
          <ul className="htp-rules">
            <li>Words must fill the <strong>entire</strong> row or column — no partial words.</li>
            <li>You can only use the letters in the pool — no more, no fewer.</li>
            <li>Tap a placed letter to lift it back off the board and try it elsewhere.</li>
            <li>The two gold letters are locked and can't be moved.</li>
          </ul>
        </section>

        {/* Scoring */}
        <section className="htp-section">
          <h3 className="htp-h3">Scoring</h3>
          <ul className="htp-rules">
            <li>Against the Droid you start on <strong>6 points</strong> and the clock eats into it — solve it quickly to keep them.</li>
            <li>Before the clock starts you get a few seconds to read the board and the clue.</li>
            <li>Reveal a letter, or unlock a clue about the long word, for a points penalty.</li>
            <li>You don't have to match the Droid exactly. Any grid where every word is real scores in full — the clock is the only thing taking points off.</li>
          </ul>
        </section>

        {/* Modes */}
        <section className="htp-section">
          <h3 className="htp-h3">Game Modes</h3>
          <div className="htp-modes">
            <div className="htp-mode">
              <strong>Play Droid</strong>
              <span>The daily puzzle, scored against the clock. Post your score to the leaderboard.</span>
            </div>
            <div className="htp-mode">
              <strong>Play Human</strong>
              <span>Build a grid yourself, then hand it over — your friend gets two letters and your pool.</span>
            </div>
            {/* Ghost Droid temporarily disabled — hidden from players.
            <div className="htp-mode">
              <strong>Ghost Droid</strong>
              <span>Letters appear one at a time — place each as it arrives.</span>
            </div>
            */}
            {/* Hidden on iOS alongside the button itself: describing a
                purchase the native build does not offer is an App Store
                problem in its own right. */}
            {!hideLightning && (
              <div className="htp-mode htp-mode-lightning">
                <strong>⚡ Play More Today</strong>
                <span>Pay 100 sats to play another Droid on any shape.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <button className="button primary htp-got-it" onClick={onClose}>Got it</button>
    </div>
  </div>
);

export default HowToPlay;
