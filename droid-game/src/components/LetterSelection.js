import React from 'react';
import LetterTile from './LetterTile';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const LetterSelection = ({
  availableLetters,
  selectedLetter,
  selectedIndex,
  capacity,
  onLetterClick,
  onDragStart,
}) => {
  const sorted = [
    ...availableLetters.filter((l) => VOWELS.has(l)),
    ...availableLetters.filter((l) => !VOWELS.has(l)),
  ];

  // Placed letters leave an invisible tile behind, so the pool keeps the same
  // number of rows all turn and the panel around it never changes size as it
  // empties. Sized by real tiles rather than CSS maths, so it stays correct
  // whatever the breakpoint does to the tile dimensions.
  const blanks = Math.max(0, (capacity || availableLetters.length) - sorted.length);

  return (
    <div className="letter-pool">
      <div className="letter-pool-grid letter-pool-grid--6col">
        {sorted.map((letter, i) => (
          <LetterTile
            key={letter + i}
            letter={letter}
            /* Matched on position as well as value, so picking one of
               several identical letters highlights only the one touched. */
            selected={selectedLetter === letter && selectedIndex === i}
            onClick={() => onLetterClick(letter, i)}
            onDragStart={(e) => onDragStart(e, letter)}
          />
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`blank-${i}`} className="letter-tile letter-tile-blank" aria-hidden="true" />
        ))}
      </div>
      {availableLetters.length === 0 && (
        <p className="pool-empty">All letters placed!</p>
      )}
    </div>
  );
};

export default LetterSelection;
