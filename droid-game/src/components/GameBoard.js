import React from 'react';
import BoardTile from './BoardTile';

const GameBoard = ({ board, onSelectTile, preservedTiles, correctTiles, selectedTile, currentPlayer, onDragStart, onDrop }) => {
  const removedSquares = [1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, x, y) => {
    e.preventDefault();
    onDrop(x, y, e);
  };

  return (
    <div className="board">
      {board.map((row, y) => 
        row.map((tile, x) => {
          const squareNumber = y * 5 + x + 1;
          const isActive = !removedSquares.includes(squareNumber);
          const isPreserved = preservedTiles.some(t => t.x === x && t.y === y);
          const isCorrect = correctTiles.some(t => t.x === x && t.y === y);
          const isSelected = selectedTile && selectedTile.x === x && selectedTile.y === y;
          return (
            <BoardTile 
              key={`${x},${y}`} 
              letter={tile}
              onSelect={() => onSelectTile(x, y)}
              isActive={isActive}
              isPreserved={isPreserved}
              isCorrect={isCorrect}
              isSelected={isSelected}
              currentPlayer={currentPlayer}
              onDragStart={(e) => onDragStart(e, tile, x, y)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, x, y)}
            />
          );
        })
      )}
    </div>
  );
};

export default GameBoard;