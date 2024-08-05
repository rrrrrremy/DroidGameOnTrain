import React, { useState } from 'react';
import Button from './Button';

const StartScreen = ({ onStart }) => {
  const [hoveredLetter, setHoveredLetter] = useState(null);
  const letters = 'DROID'.split('');

  return (
    <div className="start-screen">
      <div className="start-content">
        <h1 className="game-title">
          {letters.map((letter, index) => (
            <span 
              key={index} 
              className={`game-letter ${hoveredLetter === index ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredLetter(index)}
              onMouseLeave={() => setHoveredLetter(null)}
            >
              {letter}
            </span>
          ))}
        </h1>
        <p className="game-subtitle">Word Reconstruction Challenge</p>
        <Button onClick={onStart} primary className="start-button">
          Play Now
        </Button>
        <div className="game-info">
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span className="info-text">2 Players</span>
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