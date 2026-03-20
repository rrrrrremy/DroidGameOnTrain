import React, { useState } from 'react';

const LETTERS = 'DROID'.split('');

const STEPS = [
  { icon: '🧩', text: 'Place real English words on the 5×5 board' },
  { icon: '📤', text: 'Share the puzzle — your opponent gets the same letters' },
  { icon: '🎯', text: 'More tiles in the right spot means a higher score' },
];

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   desc: '11 pts' },
  { id: 'normal', label: 'Normal', desc: '12 pts' },
  { id: 'hard',   label: 'Hard',   desc: '13 pts' },
];

const StartScreen = ({ onStart, onStartVsComputer }) => {
  const [hovered, setHovered] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');

  return (
    <div className="start-screen">
      <div className="start-content">

        <div className="start-badge">Word Reconstruction</div>

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

        <div className="how-to-play">
          {STEPS.map(({ icon, text }, i) => (
            <div className="how-step" key={i}>
              <span className="how-icon">{icon}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className="start-buttons">
          <button className="start-button" onClick={onStart}>
            👥 2 Player Game
          </button>

          <div className="start-or"><span>or</span></div>

          <div className="vs-computer-section">
            <div className="difficulty-row">
              <span className="difficulty-label">Difficulty</span>
              <div className="difficulty-selector">
                {DIFFICULTIES.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    className={`diff-btn${difficulty === id ? ' active' : ''}`}
                    onClick={() => setDifficulty(id)}
                  >
                    <span className="diff-name">{label}</span>
                    <span className="diff-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="start-button vs-computer" onClick={() => onStartVsComputer(difficulty)}>
              🤖 Play vs Computer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;
