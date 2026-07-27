import React from 'react';

const LetterTile = ({ letter, selected, onClick, onDragStart }) => (
  <div
    className={`letter-tile${selected ? ' selected' : ''}`}
    onClick={onClick}
    draggable
    onDragStart={onDragStart}
  >
    {letter}
  </div>
);

export default LetterTile;
