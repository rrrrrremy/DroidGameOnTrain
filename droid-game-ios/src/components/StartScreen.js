import React from 'react';
import { BOARD_SHAPES, dailyShape } from '../utils/computerPlayer';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue 23 Sep", built by hand so every browser prints it the same way. */
const shortDate = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

const HelpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);

const StartScreen = ({
  onStart,
  onStartVsComputer,
  onStartGhost,
  onShowLeaderboard,
  onShowHowToPlay,
  dailyPlayed,
  dailyInProgress = false,
}) => {
  // Today's shape is shown before play: the board opens on it anyway, and
  // the rotation makes each day's card look different.
  const shape = BOARD_SHAPES[dailyShape()] ?? BOARD_SHAPES.droid;

  return (
    <div className="start-screen">
      <section className="home-panel" aria-label="Droid home screen">
        <header className="home-topbar">
          <div className="home-wordmark" aria-label="Droid">
            <span className="home-wordmark-mark" aria-hidden="true">D</span>
            <span className="home-wordmark-text" aria-hidden="true">DROID</span>
          </div>
          <button className="home-help" onClick={onShowHowToPlay} aria-label="How to Play">
            <HelpIcon />
          </button>
        </header>

        <div className={`home-daily-card${dailyPlayed ? ' is-played' : ''}`}>
          <div className="home-daily-heading">
            <span className="home-daily-label">Today's Droid</span>
            <span className="home-daily-date">{shortDate(new Date())}</span>
          </div>

          <div className="home-daily-shape">
            <div className="home-shape-grid" role="img" aria-label={`Today's board shape: ${shape.name}`}>
              {shape.grid.flat().map((on, i) => (
                <span key={i} className={on ? 'home-shape-cell is-on' : 'home-shape-cell'} />
              ))}
            </div>
            <p className="home-daily-meta">{shape.name} · 6 words · 6 minutes</p>
          </div>

          <button
            className="home-play-button"
            onClick={onStartVsComputer}
            disabled={dailyPlayed}
          >
            {/* An unfinished round is carried on, never restarted, so the
                button says so rather than promising a fresh start. */}
            <span>{dailyInProgress ? 'RESUME DROID' : 'PLAY DROID'}</span>
            {dailyPlayed && <small className="home-mode-note">Played today</small>}
            {!dailyPlayed && dailyInProgress && (
              <small className="home-mode-note">Carry on where you left off</small>
            )}
          </button>
        </div>

        <button className="home-human-button" onClick={onStart}>
          <span className="home-human-copy">
            <span className="home-human-title">PLAY HUMAN</span>
            <span className="home-human-sub">Build a board for a friend to solve</span>
          </span>
          <ChevronIcon />
        </button>

        {/* Ghost Droid temporarily disabled — logic kept intact, hidden from players.
        <button className="home-human-button" onClick={onStartGhost}>
          <span className="home-human-title">GHOST DROID</span>
        </button>
        */}

        <button className="home-leaderboard-btn" onClick={onShowLeaderboard}>
          <TrophyIcon />
          <span>Daily Leaderboard</span>
        </button>

        <footer className="home-footer">
          <span>Second Nature Games Pty Limited · ACN: 161 671 549</span>
          <span>Creators Remy Browne &amp; Matthew Browne · All Rights Reserved</span>
        </footer>
      </section>
    </div>
  );
};

export default StartScreen;
