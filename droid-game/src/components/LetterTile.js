import React from 'react';

const LetterTile = ({ letter, onDragStart }) => {
  return (
    <div 
      className="tile letter bg-white text-blue-800 border border-blue-300 active:bg-blue-100 transition-colors duration-200 cursor-move"
      draggable="true"
      onDragStart={(e) => onDragStart(e, letter)}
    >
      {letter}
    </div>
  );
};

export default LetterTile;