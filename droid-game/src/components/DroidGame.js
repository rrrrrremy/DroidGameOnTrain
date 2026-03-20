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
import {
  generateComputerBoard,
  generateDailyBoard,
  todayString,
  BOARD_SHAPES,
  extractFiveLetterWord,
  countBoardCombinations,
} from '../utils/computerPlayer';

const DAILY_STORAGE_KEY = 'droid_daily_played';

// Per-shape hint penalty (points subtracted per reveal)
const HINT_PENALTY = { droid: 1.0, cross: 0.9, invader: 0.8, bolt: 0.7 };

// Per-shape time penalty interval (seconds per 0.1pt deduction after 120s)
const TIME_INTERVAL = { droid: 10, cross: 12, invader: 15, bolt: 20 };

const emptyBoard = () =>
  Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));

/** Returns a CSS class name based on score/maxScore ratio (9-tier rainbow). */
const getScoreColorClass = (score, maxScore) => {
  if (maxScore === 0) return 'score-red';
  const r = score / maxScore;
  if (r >= 1)        return 'score-gold';
  if (r >= 11 / 12)  return 'score-purple';
  if (r >= 10 / 12)  return 'score-navy';
  if (r >= 9 / 12)   return 'score-skyblue';
  if (r >= 8 / 12)   return 'score-darkgreen';
  if (r >= 7 / 12)   return 'score-lightgreen';
  if (r >= 6 / 12)   return 'score-yellow';
  if (r >= 5 / 12)   return 'score-orange';
  return 'score-red';
};

/** Return timer CSS class based on elapsed seconds. */
const getTimerClass = (secs) => {
  if (secs <= 120) return 'timer-green';
  if (secs <= 360) return 'timer-amber';
  return 'timer-red';
};

/** Compute time penalty given elapsed seconds and shape. */
const calcTimePenalty = (seconds, shapeId) => {
  const interval = TIME_INTERVAL[shapeId] || 10;
  return Math.floor(Math.max(0, seconds - 120) / interval) / 10;
};

/** Fetch a hint string for a word via Datamuse API at runtime. */
const fetchHintWord = async (word) => {
  if (!word) return null;
  try {
    const lower = word.toLowerCase();
    const [synRes, antRes] = await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_syn=${lower}&max=5`),
      fetch(`https://api.datamuse.com/words?rel_ant=${lower}&max=3`),
    ]);
    const [syns, ants] = await Promise.all([synRes.json(), antRes.json()]);

    const clean = (w) => /^[a-z]+$/.test(w) && w.length >= 3;

    const hints = [
      ...ants.slice(0, 1).filter((i) => clean(i.word)).map((i) => `opposite of "${i.word}"`),
      ...syns.slice(0, 2).filter((i) => clean(i.word)).map((i) => `related to "${i.word}"`),
    ];

    if (hints.length > 0) return hints[Math.floor(Math.random() * hints.length)];

    // Fallback: ml= (means-like) has much broader coverage than rel_syn
    const mlRes = await fetch(`https://api.datamuse.com/words?ml=${lower}&max=5`);
    const ml = await mlRes.json();
    const mlHints = ml.slice(0, 2).filter((i) => clean(i.word)).map((i) => `related to "${i.word}"`);
    return mlHints.length > 0 ? mlHints[Math.floor(Math.random() * mlHints.length)] : null;
  } catch {
    return null;
  }
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

  // Session tracking (persists across the 4-droid game)
  const [sessionPlayedShapes, setSessionPlayedShapes] = useState([]); // ordered list
  const [sessionScores, setSessionScores] = useState({}); // shapeId → percent

  // Per-game metadata
  const [combinationCount, setCombinationCount] = useState(null);
  const [hintWord, setHintWord] = useState(null);

  const removedSquares = BOARD_SHAPES[boardShape]?.removed ?? BOARD_SHAPES.droid.removed;
  const activeTileCount = 25 - removedSquares.size;
  const maxScore = activeTileCount - 2; // minus 2 preserved tiles

  const hintPenalty = HINT_PENALTY[boardShape] ?? 1.0;

  const isPreserved = (x, y) =>
    preservedTiles.some((t) => t.x === x && t.y === y);

  const handleClearBoard = () => {
    setBoard((prev) =>
      prev.map((row, y) => row.map((cell, x) => (isPreserved(x, y) ? cell : null)))
    );
  };

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

    const shapeId = shape || 'droid';
    const fiveLetterWord = extractFiveLetterWord(decoded, shapeId);
    const combCount = countBoardCombinations(shapeId, fiveLetterWord, countLetters(decoded));

    setBoardShape(shapeId);
    setPlayer1Board(decoded);
    setPreservedTiles(preserved);
    setBoard(p2StartBoard);
    setLetterCounts(countLetters(decoded));
    setCurrentPlayer(2);
    setCombinationCount(combCount);
    setHintWord(null);
    fetchHintWord(fiveLetterWord).then(setHintWord);
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

  // ── Mode → Shape selection ─────────────────────────────────────────────────

  const handleModeSelect = (mode) => {
    setPendingMode(mode);
    setGameState('selectShape');
  };

  const handleShapeSelect = (shape) => {
    setBoardShape(shape);

    if (pendingMode === 'player1') {
      setCombinationCount(null);
      setHintWord(null);
      setGameState('player1');
      return;
    }

    // Computer or daily mode — generate the board
    const result = pendingMode === 'daily'
      ? generateDailyBoard(shape)
      : generateComputerBoard(shape);

    if (!result) {
      setValidationError('Failed to generate board — please try again.');
      setGameState('start');
      return;
    }

    const { board: computerBoardRaw, fiveLetterWord, combinationCount: combCount } = result;

    setVsComputer(true);
    if (pendingMode === 'daily') setDailyMode(true);

    const p1Board = computerBoardRaw.map((r) => [...r]);
    const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board, 2);

    setPlayer1Board(p1Board);
    setPreservedTiles(preservedLetters);
    setBoard(newBoard);
    setLetterCounts(countLetters(p1Board));
    setCurrentPlayer(2);
    setCombinationCount(combCount);
    setHintWord(null);
    fetchHintWord(fiveLetterWord).then(setHintWord);
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
      const fiveLetterWord = extractFiveLetterWord(p1Board, boardShape);
      const combCount = countBoardCombinations(boardShape, fiveLetterWord, countLetters(p1Board));
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board);
      const url = `${window.location.origin}${window.location.pathname}?g=${encodeShareParam(p1Board, preservedLetters, boardShape)}`;
      setPlayer1Board(p1Board);
      setPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(p1Board));
      setShareLink(url);
      setCombinationCount(combCount);
      setHintWord(null);
      fetchHintWord(fiveLetterWord).then(setHintWord);
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

  // Full reset including session
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
    setCombinationCount(null);
    setHintWord(null);
    setSessionPlayedShapes([]);
    setSessionScores({});
    setGameState('start');
  };

  // Reset for next droid — keeps session state
  const resetForNextDroid = (scorePercent) => {
    const newPlayed = [...sessionPlayedShapes, boardShape];
    const newScores = { ...sessionScores, [boardShape]: scorePercent };
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
    setCombinationCount(null);
    setHintWord(null);
    setSessionPlayedShapes(newPlayed);
    setSessionScores(newScores);
    setGameState('selectShape');
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

  const { score, rawScore, incorrectTiles, timePenalty } = useMemo(() => {
    if (!player1Board || gameState !== 'end') {
      return { score: 0, rawScore: 0, incorrectTiles: [], timePenalty: 0 };
    }
    const preservedSet = new Set(preservedTiles.map((t) => `${t.x},${t.y}`));

    const raw = player2FullValid
      ? maxScore
      : Math.min(correctTiles.filter((t) => !preservedSet.has(`${t.x},${t.y}`)).length, maxScore);

    const tp = calcTimePenalty(timerSeconds, boardShape);
    const hintDeduction = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
    const s = Math.min(maxScore, Math.max(0, Math.round((raw - hintDeduction - tp) * 10) / 10));

    const incorrect = player2FullValid ? [] : (() => {
      const arr = [];
      board.forEach((row, y) =>
        row.forEach((letter, x) => {
          if (letter && letter !== player1Board[y][x]) arr.push({ x, y });
        })
      );
      return arr;
    })();

    return { score: s, rawScore: raw, incorrectTiles: incorrect, timePenalty: tp };
  }, [board, player1Board, correctTiles, preservedTiles, gameState, letterHintsUsed, timerSeconds, maxScore, player2FullValid, boardShape, hintPenalty]);

  const scorePercent = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;

  // ── Live score (player 2 turn) ────────────────────────────────────────────
  const liveTimePenalty = calcTimePenalty(timerSeconds, boardShape);
  const hintDeductionLive = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
  const liveScore = Math.max(0, Math.round((maxScore - hintDeductionLive - liveTimePenalty) * 10) / 10);
  const liveScoreClass = getScoreColorClass(liveScore, maxScore);
  const livePercent = maxScore > 0 ? Math.round(liveScore / maxScore * 100) : 0;

  // Session total
  const sessionTotal = Object.values(sessionScores).reduce((a, b) => a + b, 0);
  const sessionCount = sessionPlayedShapes.length;

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
        <ShapeSelection
          onSelect={handleShapeSelect}
          sessionPlayedShapes={sessionPlayedShapes}
          sessionScores={sessionScores}
          sessionTotal={sessionTotal}
          sessionCount={sessionCount}
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

          {currentPlayer === 2 && (
            <>
              <div className="live-hud">
                <div className={`live-score-badge ${liveScoreClass}`}>
                  <span className="live-score-grade">{livePercent}%</span>
                  <span className="live-score-pts">max achievable</span>
                </div>
                {(() => {
                  const m = Math.floor(timerSeconds / 60);
                  const s = timerSeconds % 60;
                  return (
                    <span className={`hint-timer ${getTimerClass(timerSeconds)}`}>
                      {m}:{String(s).padStart(2, '0')}
                    </span>
                  );
                })()}
              </div>
              {hintWord && (
                <div className="hint-word-display">
                  Hint: {hintWord}
                </div>
              )}
              {combinationCount !== null && (
                <div className="combo-count">
                  {combinationCount} valid board combination{combinationCount !== 1 ? 's' : ''}
                </div>
              )}
            </>
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
            <div className="hint-actions">
              <button className="hint-btn" onClick={handleClearBoard}>
                Clear board
              </button>
              {currentPlayer === 2 && (
                <button className="hint-btn letter-hint-btn" onClick={handleLetterHint}>
                  Reveal letter −{hintPenalty}pt
                </button>
              )}
            </div>
            <Button onClick={handleEndTurn} primary disabled={isValidating}>
              {isValidating ? 'Checking…' : currentPlayer === 1 ? 'End Turn' : 'Finish'}
            </Button>
          </div>
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

      {gameState === 'end' && (() => {
        const thisScoreClass = getScoreColorClass(score, maxScore);
        const hintDeduction = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
        const hasPenalties = letterHintsUsed > 0 || timePenalty > 0;
        const allPlayed = [...sessionPlayedShapes, boardShape];
        const allScores = { ...sessionScores, [boardShape]: scorePercent };
        const combinedTotal = Object.values(allScores).reduce((a, b) => a + b, 0);
        const gamesPlayed = allPlayed.length;

        return (
          <div className="end-screen">
            <div className="end-header">
              <h2>Game Over!</h2>

              {/* Session combined total if more than one game played */}
              {gamesPlayed > 1 && (
                <div className="session-combined">
                  Combined total ({gamesPlayed} droids): {combinedTotal}%
                </div>
              )}

              <div className={`score-display ${thisScoreClass}`}>
                {scorePercent}%
              </div>
              <div className="score-label">
                {score}/{maxScore} pts · {BOARD_SHAPES[boardShape]?.name}
              </div>
              {hasPenalties && (
                <div className="score-penalty">
                  {rawScore}/{maxScore}
                  {letterHintsUsed > 0 && ` − ${hintDeduction} hint${letterHintsUsed !== 1 ? 's' : ''}`}
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

            <div className="end-actions">
              {gamesPlayed < 4 && (
                <Button primary onClick={() => resetForNextDroid(scorePercent)}>
                  Play Next Droid
                </Button>
              )}
              <Button onClick={resetGame} primary={gamesPlayed >= 4}>
                Play New Game
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DroidGame;
