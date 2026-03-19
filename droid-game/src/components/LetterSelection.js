import React from 'react';
import LetterTile from './LetterTile';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const LetterSelection = ({
  currentPlayer,
  availableLetters,
  selectedLetter,
  onLetterClick,
  onDragStart,
}) => {
  if (currentPlayer === 1) {
    return (
      <div className="letter-pool">
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
      </div>
    );
  }

  const vowels = availableLetters.filter((l) => VOWELS.has(l));
  const consonants = availableLetters.filter((l) => !VOWELS.has(l));

  let idx = 0;
  const renderGroup = (letters) =>
    letters.map((letter) => {
      const key = idx++;
      return (
        <LetterTile
          key={key}
          letter={letter}
          selected={selectedLetter === letter}
          onClick={() => onLetterClick(letter)}
          onDragStart={(e) => onDragStart(e, letter)}
        />
      );
    });

  return (
    <div className="letter-pool">
      {availableLetters.length === 0 ? (
        <p className="pool-empty">All letters placed!</p>
      ) : (
        <>
          {vowels.length > 0 && (
            <>
              <div className="pool-section-label">Vowels</div>
              <div className="letter-pool-grid">{renderGroup(vowels)}</div>
            </>
          )}
          {vowels.length > 0 && consonants.length > 0 && (
            <div className="pool-divider" />
          )}
          {consonants.length > 0 && (
            <>
              <div className="pool-section-label">Consonants</div>
              <div className="letter-pool-grid">{renderGroup(consonants)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LetterSelection;
