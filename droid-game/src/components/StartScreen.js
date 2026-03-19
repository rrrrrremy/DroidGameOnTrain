import React, { useState } from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({ onStart, onStartVsComputer }) => {
  const [hovered, setHovered] = useState(null);
  const [hintCount, setHintCount] = useState(2);

  return (
    <div className="start-screen">
      <div className="start-content">
        <h1 className="game-title">
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              className={`game-letter${hovered === i ? ' hovered' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {letter}
            </span>
          ))}
        </h1>

        <p className="game-subtitle">Word Reconstruction Challenge</p>

        <div className="start-buttons">
          <button className="start-button" onClick={onStart}>
            2 Player Game
          </button>

          <div className="vs-computer-section">
            <div className="hint-count-selector">
              <span className="hint-label">Locked hints:</span>
              <div className="hint-count-btns">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`hint-count-btn${hintCount === n ? ' active' : ''}`}
                    onClick={() => setHintCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button className="start-button vs-computer" onClick={() => onStartVsComputer(hintCount)}>
              Play vs Computer
            </button>
          </div>
        </div>

        <div className="game-info">
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span className="info-text">2 Players</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🤖</span>
            <span className="info-text">vs Computer</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🧠</span>
            <span className="info-text">Memory</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📚</span>
            <span className="info-text">Vocabulary</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
