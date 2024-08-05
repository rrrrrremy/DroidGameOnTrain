import React from 'react';

const BoardTile = ({ letter, onSelect, isActive, isPreserved, isCorrect, isSelected, currentPlayer, onDragStart, onDragOver, onDrop }) => {
  let tileClass = 'tile';
  if (isActive) {
    tileClass += ' active';
    if (letter) {
      if (isPreserved) {
        tileClass += ' bg-green-200 border-green-400';
      } else if (isCorrect) {
        tileClass += ' bg-yellow-200 border-yellow-400';
      } else {
        tileClass += ' bg-blue-200 border-blue-400';
      }
    } else {
      tileClass += ' bg-gray-200 border-gray-300';
    }
  } else {
    tileClass += ' bg-gray-100 border-gray-200';
  }
  if (isSelected) {
    tileClass += ' selected';
  }

  const isDraggable = isActive && letter && !isPreserved;

  return (
    <div 
      className={tileClass}
      onClick={isActive && !isPreserved ? onSelect : undefined}
      draggable={isDraggable}
      onDragStart={isDraggable ? onDragStart : undefined}
      onDragOver={isActive && !isPreserved ? onDragOver : undefined}
      onDrop={isActive && !isPreserved ? onDrop : undefined}
    >
      {letter && isActive && <span>{letter}</span>}
    </div>
  );
};

export default BoardTile;