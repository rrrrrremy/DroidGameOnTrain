import React from 'react';
import LetterTile from './LetterTile';

const LetterSelection = ({ currentPlayer, availableLetters, onDragStart }) => {
  const renderLetterGroup = (letters) => (
    <div className="flex flex-wrap justify-center gap-2 p-2">
      {letters.map((letter, index) => (
        <LetterTile 
          key={`${letter}-${index}`}
          letter={letter} 
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-4xl bg-gray-100 p-4 rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-bold mb-2 text-center">Available Letters</h2>
      {currentPlayer === 1 ? (
        renderLetterGroup(availableLetters)
      ) : (
        <div className="space-y-4">
          {renderLetterGroup(availableLetters.vowels)}
          <div className="border-t border-gray-300 my-2"></div>
          {renderLetterGroup(availableLetters.consonants)}
        </div>
      )}
    </div>
  );
};

export default LetterSelection;