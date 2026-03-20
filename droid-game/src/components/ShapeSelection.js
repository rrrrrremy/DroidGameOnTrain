import React from 'react';
import { BOARD_SHAPES, SHAPE_IDS } from '../utils/computerPlayer';

const ShapeSelection = ({ onSelect, sessionPlayedShapes = [], sessionScores = {}, sessionTotal = 0, sessionCount = 0 }) => {
  return (
    <div className="shape-selection">
      <h2 className="shape-heading">Choose Droid</h2>

      {sessionCount > 0 && (
        <div className="session-total-banner">
          Combined total ({sessionCount} droid{sessionCount !== 1 ? 's' : ''}): {sessionTotal}%
        </div>
      )}

      <div className="shape-options">
        {SHAPE_IDS.map((id) => {
          const shape = BOARD_SHAPES[id];
          const played = sessionPlayedShapes.includes(id);
          const score = sessionScores[id];
          return (
            <button
              key={id}
              className={`shape-option${played ? ' shape-option-played' : ''}`}
              onClick={() => !played && onSelect(id)}
              disabled={played}
            >
              <div className="shape-preview-grid">
                {shape.grid.flat().map((active, i) => (
                  <div
                    key={i}
                    className={`shape-cell ${active ? 'shape-cell-active' : 'shape-cell-inactive'}`}
                  />
                ))}
              </div>
              <span className="shape-name">{shape.name}</span>
              {played && score !== undefined && (
                <span className="shape-score">{score}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ShapeSelection;
