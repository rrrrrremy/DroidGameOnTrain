import React, { useState, useMemo } from 'react';
import GameBoard from './GameBoard';
import Button from './Button';
import StartScreen from './StartScreen';
import LetterSelection from './LetterSelection';
import ReturnTilesBox from './ReturnTilesBox';
import {
  countLetters,
  preserveRandomLettersForPlayer2,
  checkCorrectTiles,
} from '../utils/gameLogic';

const emptyBoard = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

const SCORE_MESSAGES = [
  [100, 'Perfect reconstruction! 🎯'],
  [75, 'Excellent memory! 🌟'],
  [50, 'Good effort! 👍'],
  [25, 'Keep practising! 💪'],
  [0, 'Better luck next time! 🎲'],
];

const getScoreMessage = (score) => {
  for (const [threshold, message] of SCORE_MESSAGES) {
    if (score >= threshold) return message;
  }
  return SCORE_MESSAGES[SCORE_MESSAGES.length - 1][1];
};

const DroidGame = () => {
  const [gameState, setGameState] = useState('start');
  const [board, setBoard] = useState(emptyBoard());
  const [player1Board, setPlayer1Board] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [preservedTiles, setPreservedTiles] = useState([]);
  const [letterCounts, setLetterCounts] = useState({});
  const [correctTiles, setCorrectTiles] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const isPreserved = (x, y) =>
    preservedTiles.some((t) => t.x === x && t.y === y);

  // Available letters: all 26 for P1; for P2, what P1 used minus what's on board
  const availableLetters = useMemo(() => {
    if (currentPlayer === 1) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const boardCounts = countLetters(board);
    const letters = [];
    Object.entries(letterCounts).forEach(([letter, count]) => {
      const avail = Math.max(0, count - (boardCounts[letter] || 0));
      for (let i = 0; i < avail; i++) letters.push(letter);
    });
    return letters.sort();
  }, [currentPlayer, letterCounts, board]);

  // ── Interactions ──────────────────────────────────────────────────────────

  const handleBoardTileClick = (x, y) => {
    if (isPreserved(x, y)) return;

    const letter = board[y][x];

    if (selectedLetter) {
      // Place the selected letter (replaces any existing letter, returning it to pool automatically)
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = selectedLetter;
      setBoard(newBoard);
      setSelectedLetter(null);
    } else if (letter) {
      // Click a filled tile to remove it (return to pool)
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
    }
    // Empty tile + nothing selected → no-op
  };

  const handleLetterClick = (letter) => {
    // Toggle selection; clicking the same letter deselects
    setSelectedLetter((prev) => (prev === letter ? null : letter));
  };

  const handleDragStart = (e, letter, srcX, srcY) => {
    e.dataTransfer.setData('letter', letter);
    if (srcX !== undefined) {
      e.dataTransfer.setData('srcX', String(srcX));
      e.dataTransfer.setData('srcY', String(srcY));
    }
  };

  const handleDrop = (targetX, targetY, e) => {
    if (isPreserved(targetX, targetY)) return;

    const letter = e.dataTransfer.getData('letter');
    if (!letter) return;

    const srcXStr = e.dataTransfer.getData('srcX');
    const srcYStr = e.dataTransfer.getData('srcY');
    const hasSrc = srcXStr !== '';
    const srcX = hasSrc ? parseInt(srcXStr) : undefined;
    const srcY = hasSrc ? parseInt(srcYStr) : undefined;

    const newBoard = board.map((r) => [...r]);

    // Clear source board tile (if dragged from board, not from pool, not preserved)
    if (hasSrc && !isNaN(srcX) && !isPreserved(srcX, srcY)) {
      newBoard[srcY][srcX] = null;
    }

    newBoard[targetY][targetX] = letter;
    setBoard(newBoard);
    setSelectedLetter(null);
  };

  // Only meaningful for Player 2 — returns a dragged board tile to the pool
  const handleDropOnReturn = (e) => {
    const srcXStr = e.dataTransfer.getData('srcX');
    const srcYStr = e.dataTransfer.getData('srcY');
    if (!srcXStr) return; // Dragged from pool — nothing to do

    const srcX = parseInt(srcXStr);
    const srcY = parseInt(srcYStr);
    if (isNaN(srcX) || isNaN(srcY) || isPreserved(srcX, srcY)) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[srcY][srcX] = null;
    setBoard(newBoard);
  };

  // ── Turn management ───────────────────────────────────────────────────────

  const handleEndTurn = () => {
    if (currentPlayer === 1) {
      const p1Board = board.map((r) => [...r]);
      setPlayer1Board(p1Board);
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board);
      setPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(p1Board));
      setCurrentPlayer(2);
      setGameState('player2');
      setSelectedLetter(null);
    } else {
      const correct = checkCorrectTiles(board, player1Board);
      setCorrectTiles(correct);
      setGameState('end');
      setSelectedLetter(null);
    }
  };

  const resetGame = () => {
    setBoard(emptyBoard());
    setPlayer1Board(null);
    setCurrentPlayer(1);
    setPreservedTiles([]);
    setLetterCounts({});
    setCorrectTiles([]);
    setSelectedLetter(null);
    setGameState('player1');
  };

  // ── Derived end-screen data ───────────────────────────────────────────────

  const { score, incorrectTiles, totalPlaced } = useMemo(() => {
    if (!player1Board || gameState !== 'end') {
      return { score: 0, incorrectTiles: [], totalPlaced: 0 };
    }
    const total = player1Board.flat().filter(Boolean).length;
    const s = total === 0 ? 0 : Math.round((correctTiles.length / total) * 100);

    const incorrect = [];
    board.forEach((row, y) =>
      row.forEach((letter, x) => {
        if (letter && letter !== player1Board[y][x]) incorrect.push({ x, y });
      })
    );

    return { score: s, incorrectTiles: incorrect, totalPlaced: total };
  }, [board, player1Board, correctTiles, gameState]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="game-container">
      {gameState === 'start' && (
        <StartScreen onStart={() => setGameState('player1')} />
      )}

      {(gameState === 'player1' || gameState === 'player2') && (
        <div className="game-play">
          <div className="player-header">
            <h1>Player {currentPlayer}'s Turn</h1>
            <p className="turn-instruction">
              {currentPlayer === 1
                ? 'Place letters on the board to create words. Click a filled tile to remove it.'
                : "Reconstruct Player 1's words! Gold tiles are locked hints."}
            </p>
          </div>

          {selectedLetter && (
            <div className="selected-indicator">
              Selected: <strong>{selectedLetter}</strong>
              <button
                className="deselect-btn"
                onClick={() => setSelectedLetter(null)}
              >
                ✕
              </button>
            </div>
          )}

          <GameBoard
            board={board}
            onTileClick={handleBoardTileClick}
            preservedTiles={preservedTiles}
            correctTiles={[]}
            incorrectTiles={[]}
            selectedLetter={selectedLetter}
            selectedTile={null}
            currentPlayer={currentPlayer}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            interactive={true}
          />

          <LetterSelection
            currentPlayer={currentPlayer}
            availableLetters={availableLetters}
            selectedLetter={selectedLetter}
            onLetterClick={handleLetterClick}
            onDragStart={handleDragStart}
          />

          {currentPlayer === 2 && (
            <ReturnTilesBox onDrop={handleDropOnReturn} />
          )}

          <div className="actions">
            <Button onClick={handleEndTurn} primary>
              {currentPlayer === 1 ? 'End Turn →' : 'Finish Game'}
            </Button>
          </div>
        </div>
      )}

      {gameState === 'end' && (
        <div className="end-screen">
          <div className="end-header">
            <h2>Game Over!</h2>
            <div
              className={`score-display ${
                score >= 75 ? 'high' : score >= 40 ? 'mid' : 'low'
              }`}
            >
              {score}%
            </div>
            <div className="score-label">
              {correctTiles.length} / {totalPlaced} tiles matched
            </div>
            <div className="score-message">{getScoreMessage(score)}</div>
          </div>

          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot correct" />
              Correct
            </div>
            <div className="legend-item">
              <div className="legend-dot incorrect" />
              Wrong
            </div>
            <div className="legend-item">
              <div className="legend-dot preserved" />
              Hint tile
            </div>
          </div>

          <div className="boards-comparison">
            <div className="board-column">
              <h3>Player 1's Original</h3>
              <GameBoard
                board={player1Board}
                onTileClick={() => {}}
                preservedTiles={[]}
                correctTiles={[]}
                incorrectTiles={[]}
                selectedLetter={null}
                selectedTile={null}
                currentPlayer={1}
                onDragStart={() => {}}
                onDrop={() => {}}
                interactive={false}
              />
            </div>
            <div className="board-column">
              <h3>Player 2's Reconstruction</h3>
              <GameBoard
                board={board}
                onTileClick={() => {}}
                preservedTiles={preservedTiles}
                correctTiles={correctTiles}
                incorrectTiles={incorrectTiles}
                selectedLetter={null}
                selectedTile={null}
                currentPlayer={2}
                onDragStart={() => {}}
                onDrop={() => {}}
                interactive={false}
              />
            </div>
          </div>

          <Button onClick={resetGame} primary>
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default DroidGame;
