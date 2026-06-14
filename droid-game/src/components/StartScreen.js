import React from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({
  onStart,
  onStartVsComputer,
  onStartCustomVsComputer,
  onStartGhost,
  onShowLeaderboard,
  onShowHowToPlay,
  dailyPlayed,
}) => {
  return (
    <div className="start-screen">
      <div className="start-content">
        <section className="home-panel" aria-label="Droid home screen">
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

          <div className="home-mode-stack" aria-label="Game modes">
            <button
              className={`home-mode-button home-mode-primary${dailyPlayed ? ' is-played' : ''}`}
              onClick={onStartVsComputer}
              disabled={dailyPlayed}
            >
              <span>PLAY DROID</span>
              {dailyPlayed && <small className="home-mode-note">Played today</small>}
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

          {dailyPlayed && (
            <button className="home-daily-button is-complete" onClick={onShowLeaderboard}>
              <span>View Leaderboard</span>
              <small>Daily results</small>
            </button>
          )}

          <button className="home-subscribe home-lightning-btn" onClick={onStartCustomVsComputer}>
            <span className="home-lightning-icon">⚡</span>
            <span className="home-lightning-label">
              <strong>KEEP PLAYING</strong>
              <small>1,000 sats · pay with Lightning</small>
            </span>
          </button>

          <button className="home-how-to" onClick={onShowHowToPlay}>How to Play</button>

          <footer className="home-footer">
            <span>Second Nature Games Pty Limited</span>
            <span>ACN: 161 671 549</span>
            <span>Creators Remy Browne &amp; Matthew Browne</span>
            <span>All Rights Reserved</span>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default StartScreen;
