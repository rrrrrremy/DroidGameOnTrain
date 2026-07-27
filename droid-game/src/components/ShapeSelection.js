import React from 'react';
import { BOARD_SHAPES, SHAPE_IDS } from '../utils/computerPlayer';

const ShapeSelection = ({ onSelect, sessionPlayedShapes = [], sessionScores = {}, sessionTotal = 0, sessionCount = 0 }) => {
  return (
    <div className="shape-selection">
      <div className="shape-header">
        <span className="start-badge">Board Setup</span>
        <h2 className="shape-heading">Choose Droid</h2>
        <p className="shape-subtitle">Each shape changes the word slots, score ceiling, and solve rhythm.</p>
      </div>

      {sessionCount > 0 && (
        <div className="session-total-banner">
          Average score ({sessionCount} droid{sessionCount !== 1 ? 's' : ''}): {sessionTotal}%
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
              <span className="shape-meta">{played ? 'Completed' : 'Available'}</span>
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
