import React from 'react';
import { BOARD_SHAPES, dailyShape } from '../utils/computerPlayer';
import { shortDate } from '../utils/dates';
import { HelpIcon, ChevronIcon, TrophyIcon } from './Icons';

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
