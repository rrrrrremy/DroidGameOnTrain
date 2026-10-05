import React from 'react';

/* `locked` (reading time, paused): the tile shows but takes no touch at all,
   so a tap cannot leave it looking pressed or picked up. */
const LetterTile = ({ letter, selected, locked = false, onClick, onDragStart }) => (
  <div
    className={`letter-tile${selected ? ' selected' : ''}${locked ? ' is-locked' : ''}`}
    onClick={locked ? undefined : onClick}
    draggable={!locked}
    onDragStart={locked ? undefined : onDragStart}
    aria-disabled={locked || undefined}
  >
    {letter}
  </div>
);

export default LetterTile;
