import React, { useState } from 'react';

const LETTERS = 'DROID'.split('');

const StartScreen = ({ onStart, onStartVsComputer }) => {
  const [hovered, setHovered] = useState(null);
  const [hintCount, setHintCount] = useState(2);
  const [difficulty, setDifficulty] = useState('normal');

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

        <div className="how-to-play">
          <div className="how-step">
            <span className="how-num">1</span>
            <p>Place real English words on the board</p>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <p>Your opponent sees which letters you used, then reconstructs your board from memory</p>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <p>More tiles in the right position means a higher score</p>
          </div>
        </div>

        <div className="start-divider" />

        <div className="start-buttons">
          <button className="start-button" onClick={onStart}>
            2 Player Game
          </button>

          <div className="vs-computer-section">
            <div className="hint-count-selector">
              <span className="hint-label">Difficulty:</span>
              <div className="difficulty-selector">
                {['easy', 'normal', 'hard'].map((d) => (
                  <button
                    key={d}
                    className={`diff-btn${difficulty === d ? ' active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
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
            <button className="start-button vs-computer" onClick={() => onStartVsComputer(hintCount, difficulty)}>
              Play vs Computer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
