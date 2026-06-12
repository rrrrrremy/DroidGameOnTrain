import React from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({
  onStart,
  onStartVsComputer,
  onStartGhost,
  onShowLeaderboard,
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
            <button className="home-mode-button home-mode-primary" onClick={onStartVsComputer}>
              <span>DROID v HUMAN</span>
            </button>

            <button className="home-mode-button" onClick={onStart}>
              <span>HUMAN v HUMAN</span>
            </button>

            <button className="home-mode-button" onClick={onStartGhost}>
              <span>GHOST DROID</span>
            </button>
          </div>

          {dailyPlayed && (
            <button className="home-daily-button is-complete" onClick={onShowLeaderboard}>
              <span>View Leaderboard</span>
              <small>Daily results</small>
            </button>
          )}

          <div className="home-subscribe">
            <span>Subscribe</span>
            <small>and play as often as you like</small>
          </div>

          <div className="home-how-to">How to Play</div>

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
