import React, { useState, useMemo, useEffect } from 'react';
import GameBoard from './GameBoard';
import Button from './Button';
import StartScreen from './StartScreen';
import LetterSelection from './LetterSelection';
import {
  countLetters,
  preserveRandomLettersForPlayer2,
  checkCorrectTiles,
  getActiveRuns,
  validateWord,
  encodeShareParam,
  decodeShareParam,
} from '../utils/gameLogic';
import { generateComputerBoard } from '../utils/computerPlayer';

const emptyBoard = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

const SCORE_MESSAGES = [
  [12, 'Perfect reconstruction!'],
  [9, 'Excellent word sense!'],
  [6, 'Good effort!'],
  [3, 'Keep practising!'],
  [0, 'Better luck next time!'],
];

const getScoreMessage = (score) => {
  for (const [threshold, message] of SCORE_MESSAGES) {
    if (score >= threshold) return message;
  }
  return SCORE_MESSAGES[SCORE_MESSAGES.length - 1][1];
};

const CopyButton = ({ url, label = 'Copy Link' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
      {copied ? 'Copied!' : label}
    </button>
  );
};

// Inactive squares (1-indexed, squareNum = y*5+x+1)
const REMOVED_SQ = new Set([1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25]);

const DroidGame = () => {
  const [gameState, setGameState] = useState('start');
  const [board, setBoard] = useState(emptyBoard());
  const [player1Board, setPlayer1Board] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [preservedTiles, setPreservedTiles] = useState([]);
  const [letterCounts, setLetterCounts] = useState({});
  const [correctTiles, setCorrectTiles] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [invalidWordTiles, setInvalidWordTiles] = useState([]);
  const [shareLink, setShareLink] = useState(null);
  const [vsComputer, setVsComputer] = useState(false);
  const [gameDifficulty, setGameDifficulty] = useState('normal');
  const [letterHintsUsed, setLetterHintsUsed] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);

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

  // Clear validation errors whenever the board changes
  useEffect(() => {
    setValidationError(null);
    setInvalidWordTiles([]);
  }, [board]);

  // On mount: detect ?g= share URL and load Player 2 state directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('g');
    if (!token) return;

    const result = decodeShareParam(token);
    if (!result) return;

    const { board: decoded, preserved } = result;
    const p2StartBoard = Array(5).fill(null).map(() => Array(5).fill(null));
    preserved.forEach(({ x, y }) => { p2StartBoard[y][x] = decoded[y][x]; });

    setPlayer1Board(decoded);
    setPreservedTiles(preserved);
    setBoard(p2StartBoard);
    setLetterCounts(countLetters(decoded));
    setCurrentPlayer(2);
    setGameState('player2');
    window.history.replaceState(null, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: only runs during vs-computer player2 phase
  useEffect(() => {
    if (!vsComputer || gameState !== 'player2') return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [vsComputer, gameState]);

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

  const handleRemoveTile = (x, y) => {
    const newBoard = board.map((r) => [...r]);
    newBoard[y][x] = null;
    setBoard(newBoard);
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

  const handleEndTurn = async () => {
    if (currentPlayer === 1) {
      const activeRuns = getActiveRuns();

      // Split runs into: fully filled, partially filled, empty
      const fullRuns = [];
      const partialRuns = [];

      for (const run of activeRuns) {
        const filled = run.filter(({ x, y }) => board[y][x]);
        if (filled.length === 0) continue;           // empty — player skipped this slot
        if (filled.length < run.length) {
          partialRuns.push(run);                     // some squares missing
        } else {
          fullRuns.push(run);                        // all squares filled
        }
      }

      // Rule 1: no partial fills allowed
      if (partialRuns.length > 0) {
        // Highlight every square in every partial run so the player can see
        // exactly what needs completing
        const seen = new Set();
        const badTiles = [];
        partialRuns.flat().forEach(({ x, y }) => {
          const key = `${x},${y}`;
          if (!seen.has(key)) { seen.add(key); badTiles.push({ x, y }); }
        });
        setInvalidWordTiles(badTiles);
        setValidationError(
          `Words must fill the entire row or column — complete or remove the highlighted tile${badTiles.length > 1 ? 's' : ''}.`
        );
        return;
      }

      // Rule 2: must have placed at least one word
      if (fullRuns.length === 0) {
        setValidationError('Place at least one complete word on the board.');
        return;
      }

      // Rule 3: every filled run must be a real English word
      setIsValidating(true);
      setValidationError(null);
      setInvalidWordTiles([]);

      try {
        const uniqueWords = [
          ...new Set(
            fullRuns.map((run) => run.map(({ x, y }) => board[y][x]).join(''))
          ),
        ];

        const results = await Promise.all(
          uniqueWords.map(async (word) => ({
            word,
            valid: await validateWord(word),
          }))
        );

        const badWords = new Set(results.filter((r) => !r.valid).map((r) => r.word));

        if (badWords.size > 0) {
          const badTiles = [];
          fullRuns.forEach((run) => {
            const word = run.map(({ x, y }) => board[y][x]).join('');
            if (badWords.has(word)) run.forEach(({ x, y }) => badTiles.push({ x, y }));
          });
          setInvalidWordTiles(badTiles);
          setValidationError(
            `Not a valid English word${badWords.size > 1 ? 's' : ''}: ${[...badWords].join(', ')}`
          );
          return;
        }
      } finally {
        setIsValidating(false);
      }

      // All checks passed — generate share link for Player 2
      const p1Board = board.map((r) => [...r]);
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board);
      const url = `${window.location.origin}${window.location.pathname}?g=${encodeShareParam(p1Board, preservedLetters)}`;
      setPlayer1Board(p1Board);
      setPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(p1Board));
      setShareLink(url);
      setGameState('share');
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
    setIsValidating(false);
    setValidationError(null);
    setInvalidWordTiles([]);
    setShareLink(null);
    setVsComputer(false);
    setGameDifficulty('normal');
    setLetterHintsUsed(0);
    setTimerSeconds(0);
    setGameState('start');
  };

  const handleStartVsComputer = (difficulty = 'normal') => {
    const computerBoard = generateComputerBoard(difficulty);
    if (!computerBoard) {
      setValidationError('Failed to generate board — please try again.');
      setGameState('start');
      return;
    }
    setVsComputer(true);
    setGameDifficulty(difficulty);

    const preRevealed = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 1 : 2;
    const p1Board = computerBoard.map((r) => [...r]);
    const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board, preRevealed);

    setPlayer1Board(p1Board);
    setPreservedTiles(preservedLetters);
    setBoard(newBoard);
    setLetterCounts(countLetters(p1Board));
    setCurrentPlayer(2);
    setGameState('player2');
    setSelectedLetter(null);
  };

  const handleLetterHint = () => {
    if (!player1Board) return;

    // Any tile on the computer's board that isn't already preserved
    const candidates = [];
    player1Board.forEach((row, y) =>
      row.forEach((letter, x) => {
        if (letter && !preservedTiles.some((t) => t.x === x && t.y === y)) {
          candidates.push({ x, y, letter });
        }
      })
    );

    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const newBoard = board.map((row) => [...row]);
    newBoard[chosen.y][chosen.x] = chosen.letter;

    // If placing this letter pushes its count on the board over the allowed total,
    // remove one other non-preserved instance of that letter to keep the pool balanced
    const maxAllowed = letterCounts[chosen.letter] || 0;
    let countOnBoard = 0;
    newBoard.forEach((row) => row.forEach((l) => { if (l === chosen.letter) countOnBoard++; }));

    if (countOnBoard > maxAllowed) {
      outer: for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (x === chosen.x && y === chosen.y) continue;
          if (newBoard[y][x] === chosen.letter && !preservedTiles.some((t) => t.x === x && t.y === y)) {
            newBoard[y][x] = null;
            break outer;
          }
        }
      }
    }

    setBoard(newBoard);
    setPreservedTiles([...preservedTiles, { x: chosen.x, y: chosen.y, letter: chosen.letter }]);
    setLetterHintsUsed((prev) => prev + 1);
  };

  // ── Derived end-screen data ───────────────────────────────────────────────

  const maxScore = gameDifficulty === 'hard' ? 13 : gameDifficulty === 'easy' ? 11 : 12;

  const { score, rawScore, incorrectTiles, totalPlaced, timePenalty } = useMemo(() => {
    if (!player1Board || gameState !== 'end') {
      return { score: 0, rawScore: 0, incorrectTiles: [], totalPlaced: 0, timePenalty: 0 };
    }
    const total = player1Board.flat().filter(Boolean).length;
    const raw = correctTiles.length;
    const tp = vsComputer ? Math.round(Math.max(0, (timerSeconds - 120) / 60) * 0.2 * 10) / 10 : 0;
    const s = Math.max(0, Math.round((raw - letterHintsUsed - tp) * 10) / 10);

    const incorrect = [];
    board.forEach((row, y) =>
      row.forEach((letter, x) => {
        if (letter && letter !== player1Board[y][x]) incorrect.push({ x, y });
      })
    );

    return { score: s, rawScore: raw, incorrectTiles: incorrect, totalPlaced: total, timePenalty: tp };
  }, [board, player1Board, correctTiles, gameState, letterHintsUsed, timerSeconds, vsComputer]);

  const scoreCard = useMemo(() => {
    if (gameState !== 'end' || !player1Board) return '';
    const preservedSet = new Set(preservedTiles.map((t) => `${t.x},${t.y}`));
    const correctSet   = new Set(correctTiles.map((t) => `${t.x},${t.y}`));
    const grid = board.map((row, y) =>
      row.map((letter, x) => {
        if (REMOVED_SQ.has(y * 5 + x + 1)) return '⬛';
        const key = `${x},${y}`;
        if (preservedSet.has(key)) return '🟨';
        if (correctSet.has(key))   return '🟩';
        if (letter)                return '🟥';
        return '⬜';
      }).join('')
    ).join('\n');
    const diffLabel  = vsComputer
      ? gameDifficulty.charAt(0).toUpperCase() + gameDifficulty.slice(1)
      : '2 Player';
    const hintsLabel = letterHintsUsed > 0 ? ` · ${letterHintsUsed} hint${letterHintsUsed !== 1 ? 's' : ''}` : '';
    return `DROID 🧠\n${grid}\n${score}/${maxScore} · ${diffLabel}${hintsLabel}`;
  }, [gameState, board, player1Board, preservedTiles, correctTiles, letterHintsUsed, score, gameDifficulty, vsComputer]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="game-container">
      {gameState !== 'start' && (
        <header className="site-header">
          <span className="site-header-title">Droid</span>
          {vsComputer && (gameState === 'player2' || gameState === 'end') && (() => {
            const m = Math.floor(timerSeconds / 60);
            const s = timerSeconds % 60;
            const over = timerSeconds > 120;
            return (
              <span className={`timer-display${over ? ' timer-over' : ''}`}>
                {m}:{String(s).padStart(2, '0')}
              </span>
            );
          })()}
        </header>
      )}

      {gameState === 'start' && (
        <StartScreen
          onStart={() => setGameState('player1')}
          onStartVsComputer={handleStartVsComputer}
        />
      )}

      {(gameState === 'player1' || gameState === 'player2') && (
        <div className="game-play">
            {isValidating && (
            <div className="validation-loading">
              <div className="spinner" />
              Checking words…
            </div>
          )}

          {validationError && !isValidating && (
            <div className="validation-error">{validationError}</div>
          )}

          <GameBoard
            board={board}
            onTileClick={handleBoardTileClick}
            onRemoveTile={currentPlayer === 1 ? handleRemoveTile : undefined}
            preservedTiles={preservedTiles}
            correctTiles={[]}
            incorrectTiles={[]}
            invalidWordTiles={invalidWordTiles}
            selectedLetter={selectedLetter}
            selectedTile={null}
            currentPlayer={currentPlayer}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            interactive={true}
          />

          <LetterSelection
            availableLetters={availableLetters}
            selectedLetter={selectedLetter}
            onLetterClick={handleLetterClick}
            onDragStart={handleDragStart}
          />

          <div className="actions">
            {vsComputer && currentPlayer === 2 && (
              <div className="hint-actions">
                <button className="hint-btn letter-hint-btn" onClick={handleLetterHint}>
                  Reveal letter −1pt
                </button>
              </div>
            )}
            <Button onClick={handleEndTurn} primary disabled={isValidating}>
              {isValidating ? 'Checking…' : currentPlayer === 1 ? 'End Turn' : 'Finish'}
            </Button>
          </div>

          {vsComputer && currentPlayer === 2 && letterHintsUsed > 0 && (
            <div className="hint-penalty-note">
              −{letterHintsUsed} pt{letterHintsUsed !== 1 ? 's' : ''} ({letterHintsUsed} hint{letterHintsUsed !== 1 ? 's' : ''})
            </div>
          )}
        </div>
      )}

      {gameState === 'share' && (
        <div className="share-panel">
          <div className="share-header">
            <h2>Turn Complete!</h2>
            <p className="share-subtext">
              Send this link to Player 2. They can open it on any device — no login needed.
            </p>
          </div>
          <div className="share-url-row">
            <span className="share-url-text">{shareLink}</span>
          </div>
          <CopyButton url={shareLink} />
          <div className="share-actions">
            <Button primary onClick={() => { setCurrentPlayer(2); setGameState('player2'); }}>
              Play on this device instead
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
                score >= maxScore * 0.75 ? 'high' : score >= maxScore * 0.42 ? 'mid' : 'low'
              }`}
            >
              {score}/{maxScore}
            </div>
            <div className="score-label">
              {correctTiles.length} / {maxScore} tiles matched
            </div>
            {vsComputer && (letterHintsUsed > 0 || timePenalty > 0) && (
              <div className="score-penalty">
                {rawScore}/{maxScore}
                {letterHintsUsed > 0 && ` − ${letterHintsUsed} hint${letterHintsUsed !== 1 ? 's' : ''}`}
                {timePenalty > 0 && ` − ${timePenalty} time`}
                {' '}= {score}/{maxScore}
              </div>
            )}
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
              <h3>{vsComputer ? "Computer's Original" : "Player 1's Original"}</h3>
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
              <h3>{vsComputer ? 'Your Reconstruction' : "Player 2's Reconstruction"}</h3>
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

          <div className="score-card">
            <pre className="score-card-grid">{scoreCard}</pre>
            <CopyButton url={scoreCard} label="Share Result" />
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
