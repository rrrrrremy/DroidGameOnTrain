import React from 'react';
import LetterTile from './LetterTile';

const LetterSelection = ({
  availableLetters,
  selectedLetter,
  onLetterClick,
  onDragStart,
}) => (
  <div className="letter-pool">
    {availableLetters.length === 0 ? (
      <p className="pool-empty">All letters placed!</p>
    ) : (
      <div className="letter-pool-grid">
        {availableLetters.map((letter, i) => (
          <LetterTile
            key={i}
            letter={letter}
            selected={selectedLetter === letter}
            onClick={() => onLetterClick(letter)}
            onDragStart={(e) => onDragStart(e, letter)}
          />
        ))}
      </div>
    )}
  </div>
);

export default LetterSelection;
