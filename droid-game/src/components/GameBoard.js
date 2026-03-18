import React from 'react';
import BoardTile from './BoardTile';

// 1-indexed square numbers that are NOT playable
const REMOVED_SQUARES = new Set([1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25]);

const GameBoard = ({
  board,
  onTileClick,
  onRemoveTile,
  preservedTiles,
  correctTiles,
  incorrectTiles,
  invalidWordTiles,
  selectedLetter,
  selectedTile,
  currentPlayer,
  onDragStart,
  onDrop,
  interactive,
}) => {
  return (
    <div className="board">
      {board.map((row, y) =>
        row.map((letter, x) => {
          const squareNum = y * 5 + x + 1;
          const isActive = !REMOVED_SQUARES.has(squareNum);
          const isPreserved = preservedTiles.some((t) => t.x === x && t.y === y);
          const isCorrect = correctTiles.some((t) => t.x === x && t.y === y);
          const isIncorrect = incorrectTiles
            ? incorrectTiles.some((t) => t.x === x && t.y === y)
            : false;
          const isInvalid = invalidWordTiles
            ? invalidWordTiles.some((t) => t.x === x && t.y === y)
            : false;
          const isSelected =
            selectedTile && selectedTile.x === x && selectedTile.y === y;

          // Highlight empty active tiles when a letter is selected from pool
          // (but not if the tile is already flagged as invalid/incomplete)
          const isHighlighted =
            interactive && !!selectedLetter && isActive && !letter && !isPreserved && !isInvalid;

          // Tiles that can be dragged: filled, non-preserved, interactive
          const draggable =
            interactive && isActive && !!letter && !isPreserved;

          // Tiles that can receive drops: active, non-preserved, interactive
          const droppable = interactive && isActive && !isPreserved;

          return (
            <BoardTile
              key={`${x}-${y}`}
              letter={letter}
              isActive={isActive}
              isPreserved={isPreserved}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              isInvalid={isInvalid}
              isHighlighted={isHighlighted}
              isSelected={isSelected}
              interactive={interactive && isActive && !isPreserved}
              onClick={() => onTileClick(x, y)}
              onRemove={onRemoveTile && isActive && !isPreserved ? () => onRemoveTile(x, y) : undefined}
              onDragStart={
                draggable ? (e) => onDragStart(e, letter, x, y) : undefined
              }
              onDragOver={
                droppable ? (e) => e.preventDefault() : undefined
              }
              onDrop={
                droppable
                  ? (e) => {
                      e.preventDefault();
                      onDrop(x, y, e);
                    }
                  : undefined
              }
            />
          );
        })
      )}
    </div>
  );
};

export default GameBoard;
