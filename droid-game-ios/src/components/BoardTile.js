import React from 'react';

const BoardTile = ({
  letter,
  isActive,
  isPreserved,
  isCorrect,
  isIncorrect,
  isInvalid,
  isHighlighted,
  isSelected,
  interactive,
  onClick,
  onRemove,
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
  } else if (isInvalid) {
    // Filled: solid orange. Empty: orange outline (shows where to fill).
    className += letter ? 'tile-invalid' : 'tile-invalid-empty';
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
      {onRemove && letter && (
        <button
          className="tile-remove-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove letter"
        >×</button>
      )}
    </div>
  );
};

export default BoardTile;
