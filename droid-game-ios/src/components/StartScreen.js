import React from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({
  onStart,
  onStartVsComputer,
  onStartGhost,
  onShowLeaderboard,
  onShowHowToPlay,
  dailyPlayed,
  dailyInProgress = false,
}) => {
  return (
    <div className="start-screen">
      <div className="start-content">
        <section className="home-panel" aria-label="Droid home screen">
          {/* Brand and tagline are one unit, so the spare height on tall
              screens falls between groups rather than splitting them. */}
          <div className="home-header">
            <div className="home-logo-card">
              <div className="brand-lockup" aria-label="Droid">
                <div className="brand-mark">D</div>
                <div className="brand-copy">
                  <span className="start-badge">Word Strategy</span>
                  <h1 className="game-title">
                    {LETTERS.map((letter, i) => (
                      <span key={i} className="game-letter">{letter}</span>
                    ))}
                  </h1>
                </div>
              </div>
            </div>

            <p className="home-tagline">
              Six Words. Six Minutes. Sick Droids.
            </p>
          </div>

          <div className="home-mode-stack" aria-label="Game modes">
            <button
              className={`home-mode-button home-mode-primary${dailyPlayed ? ' is-played' : ''}`}
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

            <button className="home-mode-button" onClick={onStart}>
              <span>PLAY HUMAN</span>
            </button>

            {/* Ghost Droid temporarily disabled — logic kept intact, hidden from players.
            <button className="home-mode-button" onClick={onStartGhost}>
              <span>GHOST DROID</span>
            </button>
            */}
          </div>

          {/* Secondary actions share a row: they are utilities, not modes,
              and pairing them keeps the play buttons the tallest things
              on screen. */}
          <div className="home-utility-row">
            <button className="home-leaderboard-btn" onClick={onShowLeaderboard}>Daily Leaderboard</button>
            <button className="home-how-to" onClick={onShowHowToPlay}>How to Play</button>
          </div>

          <footer className="home-footer">
            <span>Second Nature Games Pty Limited · ACN: 161 671 549</span>
            <span>Creators Remy Browne &amp; Matthew Browne · All Rights Reserved</span>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default StartScreen;
