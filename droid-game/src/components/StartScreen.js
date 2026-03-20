import React from 'react';

const LETTERS = 'DROID'.split('');

const STEPS = [
  { icon: '🧩', text: 'Place real English words on the 5×5 board' },
  { icon: '📤', text: 'Share the puzzle — your opponent gets the same letters' },
  { icon: '🎯', text: 'More tiles in the right spot means a higher score' },
];

const StartScreen = ({ onStart, onStartVsComputer, onStartDaily, dailyPlayed }) => {
  return (
    <div className="start-screen">
      <div className="start-content">

        <h1 className="game-title">
          {LETTERS.map((letter, i) => (
            <span key={i} className="game-letter">{letter}</span>
          ))}
        </h1>

        <div className="how-to-play">
          {STEPS.map(({ icon, text }, i) => (
            <div className="how-step" key={i}>
              <span className="how-icon">{icon}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>

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
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
