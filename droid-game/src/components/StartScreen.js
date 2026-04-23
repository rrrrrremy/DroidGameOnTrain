import React from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({ onStart, onStartVsComputer, onStartDaily, onStartGhost, onShowLeaderboard, dailyPlayed }) => {
  const primaryDailyLabel = dailyPlayed ? 'Daily Complete' : 'Daily Challenge';

  return (
    <div className="start-screen">
      <div className="start-content">
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

        <p className="start-subtitle">
          Build the grid. Match the hidden board. Outsmart the clock.
        </p>

        <div className="start-status">
          <span>5x5 boards</span>
          <span>Daily puzzle</span>
          <span>4 shapes</span>
        </div>

        <div className="start-buttons" aria-label="Game modes">
          <button className="start-button start-button-primary daily-button" onClick={onStartDaily} disabled={dailyPlayed}>
            <span className="start-button-text">
              <span className="start-button-title">{primaryDailyLabel}</span>
              <span className="start-button-meta">
                {dailyPlayed ? 'New board unlocks tomorrow' : 'One ranked puzzle each day'}
              </span>
            </span>
          </button>

          {dailyPlayed && (
            <div className="daily-played-row">
              <button className="start-button leaderboard-button" onClick={onShowLeaderboard}>
                <span className="start-button-text">
                  <span className="start-button-title">View Leaderboard</span>
                  <span className="start-button-meta">Today&apos;s scores</span>
                </span>
              </button>
            </div>
          )}

          <button className="start-button" onClick={onStart}>
            <span className="start-button-text">
              <span className="start-button-title">Two Player</span>
              <span className="start-button-meta">Create a board for someone else</span>
            </span>
          </button>

          <button className="start-button vs-computer" onClick={onStartVsComputer}>
            <span className="start-button-text">
              <span className="start-button-title">Versus Computer</span>
              <span className="start-button-meta">Play an instant generated board</span>
            </span>
          </button>

          <button className="start-button ghost-button" onClick={onStartGhost}>
            <span className="start-button-text">
              <span className="start-button-title">Ghost Droid</span>
              <span className="start-button-meta">Place each revealed letter once</span>
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
