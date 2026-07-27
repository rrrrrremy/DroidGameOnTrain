import React from 'react';
import LetterTile from './LetterTile';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const LetterSelection = ({
  availableLetters,
  selectedLetter,
  onLetterClick,
  onDragStart,
}) => {
  const sorted = [
    ...availableLetters.filter((l) => VOWELS.has(l)),
    ...availableLetters.filter((l) => !VOWELS.has(l)),
  ];

  return (
    <div className="letter-pool">
      {availableLetters.length === 0 ? (
        <p className="pool-empty">All letters placed!</p>
      ) : (
        <div className="letter-pool-grid letter-pool-grid--6col">
          {sorted.map((letter, i) => (
            <LetterTile
              key={letter + i}
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
};

export default LetterSelection;
