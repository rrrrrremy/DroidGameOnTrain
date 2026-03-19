import React from 'react';
import LetterTile from './LetterTile';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const LetterSelection = ({
  availableLetters,
  selectedLetter,
  onLetterClick,
  onDragStart,
}) => {
  const vowels = availableLetters.filter((l) => VOWELS.has(l));
  const consonants = availableLetters.filter((l) => !VOWELS.has(l));

  const renderGroup = (letters) =>
    letters.map((letter, i) => (
      <LetterTile
        key={letter + i}
        letter={letter}
        selected={selectedLetter === letter}
        onClick={() => onLetterClick(letter)}
        onDragStart={(e) => onDragStart(e, letter)}
      />
    ));

  return (
    <div className="letter-pool">
      {availableLetters.length === 0 ? (
        <p className="pool-empty">All letters placed!</p>
      ) : (
        <>
          {vowels.length > 0 && (
            <div className="letter-pool-grid">{renderGroup(vowels)}</div>
          )}
          {vowels.length > 0 && consonants.length > 0 && (
            <div className="pool-divider" />
          )}
          {consonants.length > 0 && (
            <div className="letter-pool-grid">{renderGroup(consonants)}</div>
          )}
        </>
      )}
    </div>
  );
};

export default LetterSelection;
