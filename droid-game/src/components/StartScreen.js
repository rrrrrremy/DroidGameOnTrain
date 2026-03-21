import React from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({ onStart, onStartVsComputer, onStartDaily, onStartGhost, dailyPlayed }) => {
  return (
    <div className="start-screen">
      <div className="start-content">

        <h1 className="game-title">
          {LETTERS.map((letter, i) => (
            <span key={i} className="game-letter">{letter}</span>
          ))}
        </h1>

        <div className="start-buttons">
          <button className="start-button daily-button" onClick={onStartDaily} disabled={dailyPlayed}>
            {dailyPlayed ? '✅ Daily Puzzle Complete' : '📅 Daily Puzzle'}
          </button>
          {dailyPlayed && (
            <p className="daily-played-note">Come back tomorrow for a new puzzle!</p>
          )}

          <div className="start-or"><span>or</span></div>

          <button className="start-button" onClick={onStart}>
            👥 2 Player Game
          </button>

          <div className="start-or"><span>or</span></div>

          <button className="start-button vs-computer" onClick={onStartVsComputer}>
            🤖 Play vs Computer
          </button>

          <div className="start-or"><span>or</span></div>

          <button className="start-button ghost-button" onClick={onStartGhost}>
            👻 Ghost Droid
          </button>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
