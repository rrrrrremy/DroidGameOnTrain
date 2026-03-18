import React from 'react';

const BoardTile = ({
  letter,
  isActive,
  isPreserved,
  isCorrect,
  isIncorrect,
  isHighlighted,
  isSelected,
  interactive,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  if (!isActive) {
    return <div className="tile tile-inactive" />;
  }

  let className = 'tile ';
  if (isCorrect) {
    className += 'tile-correct';
  } else if (isIncorrect) {
    className += 'tile-incorrect';
  } else if (isPreserved) {
    className += 'tile-preserved';
  } else if (letter) {
    className += 'tile-filled';
  } else if (isHighlighted) {
    className += 'tile-highlighted';
  } else {
    className += 'tile-empty';
  }

  if (isSelected) {
    className += ' tile-selected';
  }

  return (
    <div
      className={className}
      onClick={interactive ? onClick : undefined}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {letter}
    </div>
  );
};

export default BoardTile;
