import React, { useState, useMemo, useEffect } from 'react';
import GameBoard from './GameBoard';
import Button from './Button';
import StartScreen from './StartScreen';
import ShapeSelection from './ShapeSelection';
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
import { generateComputerBoard, generateDailyBoard, todayString, BOARD_SHAPES } from '../utils/computerPlayer';

const DAILY_STORAGE_KEY = 'droid_daily_played';

const emptyBoard = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

const getGrade = (score, max) => {
  if (max === 0) return 'F';
  const n = (score / max) * 12;
  if (n >= 12) return 'DUX';
  if (n >= 11.5) return 'A++';
  if (n >= 11.0) return 'A+';
  if (n >= 10.5) return 'A';
  if (n >= 10.0) return 'A−';
  if (n >= 9.5) return 'B+';
  if (n >= 9.0) return 'B';
  if (n >= 8.5) return 'B−';
  if (n >= 8.0) return 'C+';
  if (n >= 7.5) return 'C';
  if (n >= 7.0) return 'C−';
  if (n >= 6.5) return 'D+';
  if (n >= 6.0) return 'D';
  return 'F';
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
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyPlayed, setDailyPlayed] = useState(
    () => localStorage.getItem(DAILY_STORAGE_KEY) === todayString()
  );
  const [letterHintsUsed, setLetterHintsUsed] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [boardShape, setBoardShape] = useState('droid');
  const [player2FullValid, setPlayer2FullValid] = useState(false);
  const [pendingMode, setPendingMode] = useState(null); // 'player1' | 'computer' | 'daily'

  const removedSquares = BOARD_SHAPES[boardShape]?.removed ?? BOARD_SHAPES.droid.removed;
  const activeTileCount = 25 - removedSquares.size;
  const maxScore = activeTileCount - 2; // minus preserved tiles

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

    const { board: decoded, preserved, shape } = result;
    const p2StartBoard = Array(5).fill(null).map(() => Array(5).fill(null));
    preserved.forEach(({ x, y }) => { p2StartBoard[y][x] = decoded[y][x]; });

    setBoardShape(shape || 'droid');
    setPlayer1Board(decoded);
    setPreservedTiles(preserved);
    setBoard(p2StartBoard);
    setLetterCounts(countLetters(decoded));
    setCurrentPlayer(2);
    setGameState('player2');
    window.history.replaceState(null, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: runs during player2 phase (both vs-computer and two-player)
  useEffect(() => {
    if (gameState !== 'player2') return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameState]);

  // ── Interactions ──────────────────────────────────────────────────────────

  const handleBoardTileClick = (x, y) => {
    if (isPreserved(x, y)) return;

    const letter = board[y][x];

    if (selectedLetter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = selectedLetter;
      setBoard(newBoard);
      setSelectedLetter(null);
    } else if (letter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
    }
  };

  const handleLetterClick = (letter) => {
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

    if (hasSrc && !isNaN(srcX) && !isPreserved(srcX, srcY)) {
      newBoard[srcY][srcX] = null;
    }

    newBoard[targetY][targetX] = letter;
    setBoard(newBoard);
    setSelectedLetter(null);
  };

  const handleDropOnReturn = (e) => {
    const srcXStr = e.dataTransfer.getData('srcX');
    const srcYStr = e.dataTransfer.getData('srcY');
    if (!srcXStr) return;

    const srcX = parseInt(srcXStr);
    const srcY = parseInt(srcYStr);
    if (isNaN(srcX) || isNaN(srcY) || isPreserved(srcX, srcY)) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[srcY][srcX] = null;
    setBoard(newBoard);
  };

  // ── Mode → Shape selection ─────────────────────────────────────────────────

  const handleModeSelect = (mode) => {
    setPendingMode(mode);
    setGameState('selectShape');
  };

  const handleShapeSelect = (shape) => {
    setBoardShape(shape);

    if (pendingMode === 'player1') {
      setGameState('player1');
      return;
    }

    // Computer or daily mode — generate the board
    const computerBoard = pendingMode === 'daily'
      ? generateDailyBoard(shape)
      : generateComputerBoard(shape);

    if (!computerBoard) {
      setValidationError('Failed to generate board — please try again.');
      setGameState('start');
      return;
    }

    setVsComputer(true);
    if (pendingMode === 'daily') setDailyMode(true);

    const p1Board = computerBoard.map((r) => [...r]);
    const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board, 2);

    setPlayer1Board(p1Board);
    setPreservedTiles(preservedLetters);
    setBoard(newBoard);
    setLetterCounts(countLetters(p1Board));
    setCurrentPlayer(2);
    setGameState('player2');
    setSelectedLetter(null);
  };

  // ── Turn management ───────────────────────────────────────────────────────

  const handleEndTurn = async () => {
    if (currentPlayer === 1) {
      const activeRuns = getActiveRuns(boardShape);

      const fullRuns = [];
      const partialRuns = [];

      for (const run of activeRuns) {
        const filled = run.filter(({ x, y }) => board[y][x]);
        if (filled.length === 0) continue;
        if (filled.length < run.length) {
          partialRuns.push(run);
        } else {
          fullRuns.push(run);
        }
      }

      if (partialRuns.length > 0) {
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

      if (fullRuns.length === 0) {
        setValidationError('Place at least one complete word on the board.');
        return;
      }

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

      const p1Board = board.map((r) => [...r]);
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board);
      const url = `${window.location.origin}${window.location.pathname}?g=${encodeShareParam(p1Board, preservedLetters, boardShape)}`;
      setPlayer1Board(p1Board);
      setPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(p1Board));
      setShareLink(url);
      setGameState('share');
      setSelectedLetter(null);
    } else {
      // Check if every active tile is filled and every word is valid English.
      const activeRuns = getActiveRuns(boardShape);
      const allFilled = activeRuns.every((run) => run.every(({ x, y }) => board[y][x]));

      let isFullValid = false;
      if (allFilled) {
        setIsValidating(true);
        try {
          const uniqueWords = [
            ...new Set(activeRuns.map((run) => run.map(({ x, y }) => board[y][x]).join(''))),
          ];
          const results = await Promise.all(uniqueWords.map((w) => validateWord(w)));
          isFullValid = results.every(Boolean);
        } finally {
          setIsValidating(false);
        }
      }

      setPlayer2FullValid(isFullValid);

      let correct;
      if (isFullValid) {
        // Award all active tiles as correct
        const seen = new Set();
        correct = [];
        activeRuns.flat().forEach(({ x, y }) => {
          const key = `${x},${y}`;
          if (!seen.has(key)) { seen.add(key); correct.push({ x, y }); }
        });
      } else {
        // Only tiles that match player 1's exact placement score
        correct = checkCorrectTiles(board, player1Board);
      }

      setCorrectTiles(correct);
      setGameState('end');
      setSelectedLetter(null);
      if (dailyMode) {
        localStorage.setItem(DAILY_STORAGE_KEY, todayString());
        setDailyPlayed(true);
      }
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
    setDailyMode(false);
    setLetterHintsUsed(0);
    setTimerSeconds(0);
    setBoardShape('droid');
    setPendingMode(null);
    setPlayer2FullValid(false);
    setGameState('start');
  };

  const handleLetterHint = () => {
    if (!player1Board) return;

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

  const { score, rawScore, incorrectTiles, totalPlaced, timePenalty } = useMemo(() => {
    if (!player1Board || gameState !== 'end') {
      return { score: 0, rawScore: 0, incorrectTiles: [], totalPlaced: 0, timePenalty: 0 };
    }
    const total = player1Board.flat().filter(Boolean).length;
    const preservedSet = new Set(preservedTiles.map((t) => `${t.x},${t.y}`));

    // Full-board valid: award maxScore regardless of exact tile positions
    const raw = player2FullValid
      ? maxScore
      : Math.min(correctTiles.filter((t) => !preservedSet.has(`${t.x},${t.y}`)).length, maxScore);

    const tp = Math.round(Math.max(0, timerSeconds - 120) / 10) * 0.1;
    const s = Math.min(maxScore, Math.max(0, Math.round((raw - letterHintsUsed - tp) * 10) / 10));

    // Incomplete puzzle: only matched tiles score; full-valid puzzle has no incorrect tiles
    const incorrect = player2FullValid ? [] : (() => {
      const arr = [];
      board.forEach((row, y) =>
        row.forEach((letter, x) => {
          if (letter && letter !== player1Board[y][x]) arr.push({ x, y });
        })
      );
      return arr;
    })();

    return { score: s, rawScore: raw, incorrectTiles: incorrect, totalPlaced: total, timePenalty: tp };
  }, [board, player1Board, correctTiles, preservedTiles, gameState, letterHintsUsed, timerSeconds, maxScore, player2FullValid]);

  const scoreCard = useMemo(() => {
    if (gameState !== 'end' || !player1Board) return '';
    const preservedSet = new Set(preservedTiles.map((t) => `${t.x},${t.y}`));
    const correctSet   = new Set(correctTiles.map((t) => `${t.x},${t.y}`));
    const grid = board.map((row, y) =>
      row.map((letter, x) => {
        if (removedSquares.has(y * 5 + x + 1)) return '⬛';
        const key = `${x},${y}`;
        if (preservedSet.has(key)) return '🟨';
        if (correctSet.has(key))   return '🟩';
        if (letter)                return '🟥';
        return '⬜';
      }).join('')
    ).join('\n');
    const modeLabel  = dailyMode ? `Daily ${todayString()}` : vsComputer ? 'vs Computer' : '2 Player';
    const hintsLabel = letterHintsUsed > 0 ? ` · ${letterHintsUsed} hint${letterHintsUsed !== 1 ? 's' : ''}` : '';
    return `DROID 🧠\n${grid}\n${score}/${maxScore} · ${modeLabel}${hintsLabel}`;
  }, [gameState, board, player1Board, preservedTiles, correctTiles, letterHintsUsed, score, vsComputer, dailyMode, maxScore, removedSquares]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="game-container">
      {gameState !== 'start' && gameState !== 'selectShape' && (
        <header className="site-header">
          <span className="site-header-title" onClick={resetGame} style={{cursor:'pointer'}}>Droid</span>
            </header>
      )}

      {gameState === 'start' && (
        <StartScreen
          onStart={() => handleModeSelect('player1')}
          onStartVsComputer={() => handleModeSelect('computer')}
          onStartDaily={() => handleModeSelect('daily')}
          dailyPlayed={dailyPlayed}
        />
      )}

      {gameState === 'selectShape' && (
        <ShapeSelection onSelect={handleShapeSelect} />
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
            removedSquares={removedSquares}
          />

          <LetterSelection
            availableLetters={availableLetters}
            selectedLetter={selectedLetter}
            onLetterClick={handleLetterClick}
            onDragStart={handleDragStart}
          />

          <div className="actions">
            {currentPlayer === 2 && (
              <div className="hint-actions">
                <button className="hint-btn letter-hint-btn" onClick={handleLetterHint}>
                  Reveal letter −1pt
                </button>
                {(() => {
                  const m = Math.floor(timerSeconds / 60);
                  const s = timerSeconds % 60;
                  const over = timerSeconds > 120;
                  return (
                    <span className={`hint-timer${over ? ' timer-over' : ''}`}>
                      {m}:{String(s).padStart(2, '0')}
                    </span>
                  );
                })()}
              </div>
            )}
            <Button onClick={handleEndTurn} primary disabled={isValidating}>
              {isValidating ? 'Checking…' : currentPlayer === 1 ? 'End Turn' : 'Finish'}
            </Button>
          </div>

          {currentPlayer === 2 && letterHintsUsed > 0 && (
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
                score >= maxScore * (10 / 12) ? 'high' : score >= maxScore * (7.5 / 12) ? 'mid' : 'low'
              }`}
            >
              {getGrade(score, maxScore)}
            </div>
            <div className="score-label">
              {score}/{maxScore} pts
            </div>
            {(letterHintsUsed > 0 || timePenalty > 0) && (
              <div className="score-penalty">
                {rawScore}/{maxScore}
                {letterHintsUsed > 0 && ` − ${letterHintsUsed} hint${letterHintsUsed !== 1 ? 's' : ''}`}
                {timePenalty > 0 && ` − ${timePenalty} time`}
                {' '}= {score}/{maxScore}
              </div>
            )}
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
                removedSquares={removedSquares}
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
                removedSquares={removedSquares}
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
