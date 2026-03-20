import React from 'react';
import { BOARD_SHAPES, SHAPE_IDS } from '../utils/computerPlayer';

const ShapeSelection = ({ onSelect }) => {
  return (
    <div className="shape-selection">
      <h2 className="shape-heading">Choose Board</h2>
      <div className="shape-options">
        {SHAPE_IDS.map((id) => {
          const shape = BOARD_SHAPES[id];
          return (
            <button key={id} className="shape-option" onClick={() => onSelect(id)}>
              <div className="shape-preview-grid">
                {shape.grid.flat().map((active, i) => (
                  <div
                    key={i}
                    className={`shape-cell ${active ? 'shape-cell-active' : 'shape-cell-inactive'}`}
                  />
                ))}
              </div>
              <span className="shape-name">{shape.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ShapeSelection;
