import React, { useState } from 'react';

const ReturnTilesBox = ({ onDrop }) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`return-box${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e);
      }}
    >
      <span className="return-box-icon">↩</span>
      <span className="return-box-text">Drag tile here to return it</span>
    </div>
  );
};

export default ReturnTilesBox;
