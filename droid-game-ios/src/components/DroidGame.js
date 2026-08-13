import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  dailyShape,
  BOARD_SHAPES,
  extractFiveLetterWord,
  countBoardCombinations,
  isKnownWord,
} from '../utils/computerPlayer';
import Leaderboard from './Leaderboard';
import { SHARE_BASE_URL } from '../config';
import {
  copyText,
  isNative,
  onShareLinkOpened,
  tapFeedback,
  resultFeedback,
} from '../native/ios';
import PaymentModal from './PaymentModal';
import HowToPlay from './HowToPlay';
import { hasSubmittedLeaderboardScore, preloadLeaderboard } from '../utils/leaderboard';

const DAILY_STORAGE_KEY = 'droid_daily_played';
const TIMER_STORAGE_KEY = 'droid_timer_enabled';
const PREPARED_DAILY_CACHE_VERSION = 2;

// Per-shape hint penalty (points subtracted per reveal)
const HINT_PENALTY = { droid: 1.0, cross: 0.9, invader: 0.8, bolt: 0.7 };

// Per-shape time penalty interval (seconds per 0.1pt deduction after 120s)
const TIME_INTERVAL = { droid: 10, cross: 12, invader: 15, bolt: 20 };

const TIMED_COMPUTER_MAX_SCORE = 6;
// Seconds at which a letter is auto-revealed
const AUTO_REVEAL_SECONDS = [60, 120, 180, 240];
const WRONG_PLACE_PENALTY = 0.3;
const READING_TIME_SECONDS = 6;
const GHOST_SCORE_MAX = 6;
const GHOST_SHIFT_SWAP_MILESTONES = [8, 11, 14];

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

/** Compute time penalty given elapsed seconds and shape. */
const calcTimePenalty = (seconds, shapeId) => {
  const interval = TIME_INTERVAL[shapeId] || 10;
  return Math.floor(Math.max(0, seconds - 120) / interval) / 10;
};

const calcTimedComputerBaseScore = (seconds) => {
  if (seconds < 60) return TIMED_COMPUTER_MAX_SCORE;
  // 60–120 s: –0.1 every 12 s, first deduction at exactly 60 s
  // (offset 48 = 60 − 12 puts the first floor-tick at t=60)
  const d2 = Math.floor((Math.min(seconds, 120) - 48) / 12);
  // 120–180 s: –0.1 every 6 s
  const d3 = seconds > 120 ? Math.floor((Math.min(seconds, 180) - 120) / 6) : 0;
  // 180–240 s: –0.1 every 4 s
  const d4 = seconds > 180 ? Math.floor((Math.min(seconds, 240) - 180) / 4) : 0;
  // After 240 s: –0.1 every 3 s
  const d5 = seconds > 240 ? Math.floor((seconds - 240) / 3) : 0;
  return Math.max(0, Math.round((TIMED_COMPUTER_MAX_SCORE - (d2 + d3 + d4 + d5) * 0.1) * 10) / 10);
};

const timedRevealCountForTime = (seconds) =>
  AUTO_REVEAL_SECONDS.filter((t) => seconds >= t).length;

const formatElapsedTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/** Create a deterministic clue from the hidden 5-letter anchor word. */
const makeWordHint = (word) => {
  if (!word || !/^[A-Z]{5}$/.test(word)) return null;

  const letters = word.split('');
  const vowelCount = letters.filter((letter) => VOWELS.has(letter)).length;
  const repeatedLetters = [...new Set(
    letters.filter((letter, index) => letters.indexOf(letter) !== index)
  )];
  const repeatText = repeatedLetters.length > 0
    ? `repeats ${repeatedLetters.join(', ')}`
    : 'no repeated letters';

  return `Anchor word: ${letters[0]} _ _ _ ${letters[4]} · ${vowelCount} vowel${vowelCount !== 1 ? 's' : ''} · ${repeatText}`;
};

const CopyButton = ({ url, label = 'Copy Link' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(url);
    tapFeedback();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
      {copied ? 'Copied!' : label}
    </button>
  );
};

const NativeShareButton = ({ url, title = 'Droid Challenge', text = 'Can you beat my Droid?' }) => {
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(typeof navigator !== 'undefined' && Boolean(navigator.share));
  }, []);

  const handleShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Native share failed', error);
      }
    }
  };

  if (!shareSupported) return null;

  return (
    <button className="native-share-btn" onClick={handleShare}>
      Share
    </button>
  );
};

/** Order letters for ghost mode: vowels first (alphabetical), then consonants (alphabetical). */
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const ghostLetterOrder = (letters) => {
  const vowels = letters.filter((l) => VOWELS.has(l)).sort();
  const consonants = letters.filter((l) => !VOWELS.has(l)).sort();
  return [...vowels, ...consonants];
};

const DroidGame = () => {
  const [gameState, setGameState] = useState('start');
  const [board, setBoard] = useState(emptyBoard());
  const [player1Board, setPlayer1Board] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [preservedTiles, setPreservedTiles] = useState([]);
  const [, setStarterPreservedTiles] = useState([]);
  const [letterCounts, setLetterCounts] = useState({});
  const [correctTiles, setCorrectTiles] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  // Which tile in the letter pool was tapped. Only used to highlight that
  // one tile when the pool holds several copies of the same letter; a stale
  // value is harmless because the highlight also requires selectedLetter.
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [invalidWordTiles, setInvalidWordTiles] = useState([]);
  const [shareLink, setShareLink] = useState(null);
  const [vsComputer, setVsComputer] = useState(false);
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyPlayed, setDailyPlayed] = useState(
    () => localStorage.getItem(DAILY_STORAGE_KEY) === todayString()
  );
  const [dailyScoreSubmitted, setDailyScoreSubmitted] = useState(
    () => hasSubmittedLeaderboardScore(todayString())
  );
  const [preparedDailyGame, setPreparedDailyGame] = useState(null);
  const [isPreparingDaily, setIsPreparingDaily] = useState(false);
  const [letterHintsUsed, setLetterHintsUsed] = useState(0);
  const [timedAutoReveals, setTimedAutoReveals] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [appHidden, setAppHidden] = useState(false);
  const [readingSecondsLeft, setReadingSecondsLeft] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(
    () => localStorage.getItem(TIMER_STORAGE_KEY) !== 'false'
  );
  const [boardShape, setBoardShape] = useState('droid');
  // Who authored the board Player 2 is solving. The turn plays identically
  // either way; this only decides what the answer screen calls the grid.
  const [boardAuthor, setBoardAuthor] = useState('droid'); // 'droid' | 'human'
  const [player2FullValid, setPlayer2FullValid] = useState(false);
  const [pendingMode, setPendingMode] = useState(null); // 'player1' | 'computer' | 'daily' | 'ghost'
  const [isPaused, setIsPaused] = useState(false);
  // Guards against finalizing a timed round more than once (submit + auto-end race)
  const finalizingRef = useRef(false);

  // Session tracking (persists across the 4-droid game)
  const [sessionPlayedShapes, setSessionPlayedShapes] = useState([]); // ordered list
  const [sessionScores, setSessionScores] = useState({}); // shapeId → percent

  // Per-game metadata
  const [combinationCount, setCombinationCount] = useState(null);
  const [hintWord, setHintWord] = useState(null);
  const [wordHintUsed, setWordHintUsed] = useState(false);
  const [challenge, setChallenge] = useState(null);

  // ── Ghost mode state ──────────────────────────────────────────────────────
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostLetterQueue, setGhostLetterQueue] = useState([]); // ordered letters to reveal
  const [ghostCurrentIndex, setGhostCurrentIndex] = useState(0); // which letter is being placed
  const [ghostShiftPromptMilestone, setGhostShiftPromptMilestone] = useState(null);
  const [ghostShiftUsedMilestones, setGhostShiftUsedMilestones] = useState([]);
  const [ghostAction, setGhostAction] = useState(null); // null | 'shift-swap-select-first' | 'shift-swap-select-second'
  const [ghostActionTile, setGhostActionTile] = useState(null); // first tile selected for swap/move

  // ── Leaderboard state ──────────────────────────────────────────────────────
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // ── Lightning payment state ───────────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ── How-to-play overlay ────────────────────────────────────────────────────
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const setViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('resize', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    const preload = () => preloadLeaderboard(todayString());
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(preload, { timeout: 2500 })
      : null;
    const timeoutId = idleId ? null : window.setTimeout(preload, 1200);

    return () => {
      if (idleId !== null && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const preparedDailyCacheKey = () =>
    `droid_prepared_daily_${todayString()}_${dailyShape()}_v${PREPARED_DAILY_CACHE_VERSION}`;

  const isPreparedDailyGame = (prepared) =>
    prepared?.date === todayString()
    && prepared?.shape === dailyShape()
    && prepared?.result?.board
    && prepared?.result?.fiveLetterWord
    && Array.isArray(prepared?.result?.preservedLetters);

  const readPreparedDailyGame = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(preparedDailyCacheKey()) || 'null');
      return isPreparedDailyGame(cached) ? cached : null;
    } catch {
      return null;
    }
  };

  const prepareDailyGame = () => {
    if (isPreparedDailyGame(preparedDailyGame)) return preparedDailyGame;

    const cached = readPreparedDailyGame();
    if (cached) {
      setPreparedDailyGame(cached);
      return cached;
    }

    const shape = dailyShape();
    const result = generateDailyBoard(shape);
    if (!result) return null;

    const prepared = { date: todayString(), shape, result };
    try {
      localStorage.setItem(preparedDailyCacheKey(), JSON.stringify(prepared));
    } catch {
      // Ignore cache write failures; the prepared in-memory result is enough.
    }
    setPreparedDailyGame(prepared);
    return prepared;
  };

  useEffect(() => {
    if (gameState !== 'start') return;
    if (isPreparedDailyGame(preparedDailyGame)) return;

    const timeoutId = window.setTimeout(() => {
      prepareDailyGame();
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [gameState, preparedDailyGame]); // eslint-disable-line react-hooks/exhaustive-deps

  const removedSquares = BOARD_SHAPES[boardShape]?.removed ?? BOARD_SHAPES.droid.removed;
  const activeTileCount = 25 - removedSquares.size;
  const maxScore = activeTileCount - 2; // minus 2 preserved tiles

  const hintPenalty = HINT_PENALTY[boardShape] ?? 1.0;
  const isTimedComputerGame = timerEnabled && vsComputer && !ghostMode && currentPlayer === 2;
  const isTimedComputerActive = isTimedComputerGame && gameState === 'player2';
  const isTimedComputerScoring = isTimedComputerGame && gameState === 'end';
  const isReadingTime = isTimedComputerActive && readingSecondsLeft > 0;

  const isPreserved = (x, y) =>
    preservedTiles.some((t) => t.x === x && t.y === y);

  const handleClearBoard = () => {
    if (isReadingTime) return;
    if (isPaused) return;
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

  // How many tiles the pool holds when full, so it can reserve the space and
  // not shrink as letters are placed. Mirrors how availableLetters is derived.
  const poolCapacity = useMemo(() => {
    if (currentPlayer === 1) return 26;
    const total = Object.values(letterCounts).reduce((sum, n) => sum + n, 0);
    // Preserved letters start on the board and can never return to the pool,
    // so counting them would reserve a row that stays empty all game.
    return Math.max(0, total - preservedTiles.length);
  }, [currentPlayer, letterCounts, preservedTiles]);

  // Clear validation errors whenever the board changes
  useEffect(() => {
    setValidationError(null);
    setInvalidWordTiles([]);
  }, [board]);

  /** Start Player 2's turn on a board somebody else authored.
   *
   * Solving a board is one turn with one set of rules - the same layout, the
   * same reading time, the same clock, the same scoring - whether the Droid
   * built the grid or another person did. The two entry points (opening a
   * shared link, and handing the phone over after building a board) used to
   * set the turn up separately, which is how one of them ended up with a
   * different screen and no timer. Both go through here now.
   *
   * vsComputer is what the rest of the component keys the solving turn off;
   * it means "Player 2 is solving someone else's board", not "the Droid made
   * it". boardAuthor carries the provenance.
   */
  const beginSolvingTurn = ({ author, timed }) => {
    setBoardAuthor(author);
    setVsComputer(true);
    setDailyMode(false);
    setCurrentPlayer(2);
    setSelectedLetter(null);
    setSelectedPoolIndex(null);
    setLetterHintsUsed(0);
    setWordHintUsed(false);
    setTimedAutoReveals(0);
    setTimerSeconds(0);
    setIsPaused(false);
    finalizingRef.current = false;
    setTimerEnabled(timed);
    setReadingSecondsLeft(timed ? READING_TIME_SECONDS : 0);
    setGameState('player2');
  };

  /** Load a shared board token and drop straight into the Player 2 turn. */
  const loadSharedBoard = useCallback((token) => {
    const result = decodeShareParam(token);
    if (!result) return;

    const { board: decoded, preserved, shape, meta } = result;
    const p2StartBoard = Array(5).fill(null).map(() => Array(5).fill(null));
    preserved.forEach(({ x, y }) => { p2StartBoard[y][x] = decoded[y][x]; });

    const shapeId = shape || 'droid';
    const fiveLetterWord = extractFiveLetterWord(decoded, shapeId);
    const combCount = countBoardCombinations(shapeId, fiveLetterWord, countLetters(decoded));
    const incomingChallenge = meta?.type === 'challenge' ? meta : null;

    setBoardShape(shapeId);
    setPlayer1Board(decoded);
    setPreservedTiles(preserved);
    setStarterPreservedTiles(preserved);
    setBoard(p2StartBoard);
    setLetterCounts(countLetters(decoded));
    setCurrentPlayer(2);
    setCombinationCount(combCount);
    setHintWord(makeWordHint(fiveLetterWord));
    setChallenge(incomingChallenge);
    beginSolvingTurn({
      author: 'human',
      timed: incomingChallenge?.scoring === 'timed' ? true : timerEnabled,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: detect a ?g= share URL and load Player 2 state directly.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('g');
    if (!token) return;
    loadSharedBoard(token);
    window.history.replaceState(null, '', window.location.pathname);
  }, [loadSharedBoard]);

  // On iOS the app never launches with a query string. Shared boards arrive
  // instead as a droid://play?g=... link, which can also fire while the app
  // is already open and warm.
  useEffect(() => onShareLinkOpened(loadSharedBoard), [loadSharedBoard]);

  // Timer: runs during player2 and ghost phases
  // The round is scored on elapsed time, so the clock must not keep running
  // while the app is off screen - backgrounded, or the phone locked. Without
  // this a player returns to a round that quietly aged, and a board they
  // solve in four minutes can score as though it took six.
  useEffect(() => {
    const onVisibility = () => setAppHidden(document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!timerEnabled) return;
    if (gameState !== 'player2' && gameState !== 'ghost') return;
    if (isReadingTime) return;
    if (isPaused) return;
    if (appHidden) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameState, isPaused, timerEnabled, isReadingTime, appHidden]);

  useEffect(() => {
    if (!isReadingTime || isPaused) return;
    const id = setInterval(() => {
      setReadingSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isReadingTime, isPaused]);

  useEffect(() => {
    if (!isTimedComputerActive) return;
    const revealTarget = timedRevealCountForTime(timerSeconds);
    if (revealTarget <= timedAutoReveals) return;

    revealCorrectLetter({ countAsHint: false });
    setTimedAutoReveals((prev) => prev + 1);
  }, [isTimedComputerActive, timerSeconds, timedAutoReveals]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-end the timed Droid v Human round the moment the live score hits 0.
  useEffect(() => {
    if (!isTimedComputerActive) return;
    const liveTimed =
      calcTimedComputerBaseScore(timerSeconds)
      - Math.round(letterHintsUsed * hintPenalty * 10) / 10
      - (wordHintUsed ? 2 : 0);
    if (liveTimed > 0) return;
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    (async () => {
      const { isFullValid } = await validateSolverBoard();
      applyRoundResult(isFullValid);
    })();
  }, [isTimedComputerActive, timerSeconds, letterHintsUsed, hintPenalty, wordHintUsed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Interactions ──────────────────────────────────────────────────────────

  const handleBoardTileClick = (x, y) => {
    if (isReadingTime) return;
    if (isPaused) return;
    if (isPreserved(x, y)) return;

    const letter = board[y][x];

    if (selectedLetter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = selectedLetter;
      setBoard(newBoard);
      setSelectedLetter(null);
      tapFeedback();
    } else if (letter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
      tapFeedback();
    }
  };

  const handleLetterClick = (letter, index) => {
    if (isReadingTime) return;
    if (isPaused) return;
    const isSameTile = selectedLetter === letter && selectedPoolIndex === index;
    setSelectedLetter(isSameTile ? null : letter);
    setSelectedPoolIndex(isSameTile ? null : index);
    tapFeedback();
  };

  const handleRemoveTile = (x, y) => {
    if (isReadingTime) return;
    if (isPaused) return;
    const newBoard = board.map((r) => [...r]);
    newBoard[y][x] = null;
    setBoard(newBoard);
  };

  const handleDragStart = (e, letter, srcX, srcY) => {
    if (isReadingTime || isPaused) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('letter', letter);
    if (srcX !== undefined) {
      e.dataTransfer.setData('srcX', String(srcX));
      e.dataTransfer.setData('srcY', String(srcY));
    }
  };

  const handleDrop = (targetX, targetY, e) => {
    if (isReadingTime) return;
    if (isPaused) return;
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

  // Ghost-mode derived state
  const ghostCurrentLetter = ghostMode && ghostCurrentIndex < ghostLetterQueue.length
    ? ghostLetterQueue[ghostCurrentIndex]
    : null;
  const ghostLetterPlaced = ghostMode && ghostCurrentLetter && (() => {
    // Check if the current letter has been placed on a non-preserved tile
    let placedCount = 0;
    board.forEach((row, y) => row.forEach((letter, x) => {
      if (letter === ghostCurrentLetter && !preservedTiles.some((t) => t.x === x && t.y === y)) placedCount++;
    }));
    // Count how many of this letter should have been placed from previous reveals
    let expectedPrev = 0;
    for (let i = 0; i < ghostCurrentIndex; i++) {
      if (ghostLetterQueue[i] === ghostCurrentLetter) expectedPrev++;
    }
    // Only count hint-locked preserved tiles (not the initial 2 preserved tiles from game start)
    let preservedCount = 0;
    preservedTiles.forEach((t) => { if (t.isHint && board[t.y]?.[t.x] === ghostCurrentLetter) preservedCount++; });
    return placedCount + preservedCount > expectedPrev;
  })();
  const ghostAllPlaced = ghostMode && ghostCurrentIndex >= ghostLetterQueue.length;
  const ghostIsLastLetter = ghostMode && ghostCurrentIndex === ghostLetterQueue.length - 1;
  const ghostCanAdvance = ghostMode && !ghostAllPlaced && ghostLetterPlaced && !ghostAction && !ghostIsLastLetter;
  const ghostPlayedCount = ghostCurrentIndex + (ghostLetterPlaced ? 1 : 0);
  const ghostDueShiftMilestone = ghostCanAdvance
    && GHOST_SHIFT_SWAP_MILESTONES.includes(ghostPlayedCount)
    && !ghostShiftUsedMilestones.includes(ghostPlayedCount)
      ? ghostPlayedCount
      : null;
  const ghostActiveShiftMilestone = ghostShiftPromptMilestone ?? ghostDueShiftMilestone;
  const ghostShiftQuestionVisible = ghostActiveShiftMilestone !== null;
  const ghostShiftSwapActive = ghostAction?.startsWith('shift-swap');
  const ghostCanSubmit = ghostMode && !ghostShiftQuestionVisible && (ghostAllPlaced || (ghostIsLastLetter && ghostLetterPlaced && !ghostAction));

  const handleShapeSelect = (shape, modeOverride, preparedResult = null) => {
    const mode = modeOverride ?? pendingMode ?? 'computer';
    setIsPaused(false);
    setBoardShape(shape);

    if (mode === 'player1') {
      setCombinationCount(null);
      setHintWord(null);
      setBoardAuthor('human');
      setGameState('player1');
      return;
    }

    setBoardAuthor('droid');

    // Computer, daily, or ghost mode — generate the board
    const result = preparedResult || (mode === 'daily'
      ? generateDailyBoard(shape)
      : generateComputerBoard(shape));

    if (!result) {
      setValidationError('Failed to generate board — please try again.');
      setGameState('start');
      return;
    }

    const { board: computerBoardRaw, fiveLetterWord, combinationCount: combCount } = result;

    setVsComputer(true);
    if (mode === 'daily') setDailyMode(true);

    const p1Board = computerBoardRaw.map((r) => [...r]);
    let preservedLetters;
    let newBoard;
    if (result.preservedLetters?.length > 0) {
      preservedLetters = result.preservedLetters.map((tile) => ({ ...tile }));
      newBoard = emptyBoard();
      preservedLetters.forEach(({ x, y, letter }) => {
        newBoard[y][x] = letter;
      });
    } else {
      const preservedStart = preserveRandomLettersForPlayer2(p1Board, 2, shape);
      preservedLetters = preservedStart.preservedLetters;
      newBoard = preservedStart.newBoard;
    }

    setPlayer1Board(p1Board);
    setPreservedTiles(preservedLetters);
    setStarterPreservedTiles(preservedLetters);
    setBoard(newBoard);
    setLetterCounts(countLetters(p1Board));
    setCurrentPlayer(2);
    setCombinationCount(combCount);
    setHintWord(makeWordHint(fiveLetterWord));
    setSelectedLetter(null);
    setTimedAutoReveals(0);
    setTimerSeconds(0);
    finalizingRef.current = false;
    setChallenge(null);
    setReadingSecondsLeft(timerEnabled && (mode === 'computer' || mode === 'daily') ? READING_TIME_SECONDS : 0);

    if (mode === 'ghost') {
      // Build the ghost letter queue: all non-preserved letters, ordered vowels-first
      const removed = BOARD_SHAPES[shape]?.removed ?? BOARD_SHAPES.droid.removed;
      const preservedSet = new Set(preservedLetters.map((t) => `${t.x},${t.y}`));
      const letters = [];
      p1Board.forEach((row, y) =>
        row.forEach((letter, x) => {
          const sq = y * 5 + x + 1;
          if (letter && !removed.has(sq) && !preservedSet.has(`${x},${y}`)) {
            letters.push(letter);
          }
        })
      );
      setGhostMode(true);
      setGhostLetterQueue(ghostLetterOrder(letters));
      setGhostCurrentIndex(0);
      setGhostShiftPromptMilestone(null);
      setGhostShiftUsedMilestones([]);
      setGhostAction(null);
      setGhostActionTile(null);
      setGameState('ghost');
    } else {
      setGameState('player2');
    }
  };

  const handleModeSelect = (mode) => {
    setPendingMode(mode);
    if (mode === 'daily') {
      setTimerEnabled(true);
      localStorage.setItem(TIMER_STORAGE_KEY, 'true');
      const prepared = isPreparedDailyGame(preparedDailyGame)
        ? preparedDailyGame
        : readPreparedDailyGame();

      if (prepared) {
        setPreparedDailyGame(prepared);
        handleShapeSelect(prepared.shape, 'daily', prepared.result);
        return;
      }

      setIsPreparingDaily(true);
      setGameState('preparingDaily');
      window.setTimeout(() => {
        const freshPrepared = prepareDailyGame();
        setIsPreparingDaily(false);
        if (freshPrepared) {
          handleShapeSelect(freshPrepared.shape, 'daily', freshPrepared.result);
        } else {
          setValidationError('Failed to prepare board — please try again.');
          setGameState('start');
        }
      }, 0);
      return;
    }
    setGameState('selectShape');
  };

  // ── Turn management ───────────────────────────────────────────────────────

  // Validate the solver's board: are all active tiles filled, and is every
  // row/column a valid English word?
  const validateSolverBoard = async () => {
    const activeRuns = getActiveRuns(boardShape);
    const allFilled = activeRuns.every((run) => run.every(({ x, y }) => board[y][x]));
    if (!allFilled) return { allFilled: false, isFullValid: false };

    // A board identical to the original needs no dictionary lookups — its
    // words are valid by construction. This is the common case on submit,
    // and the dictionary API is slow enough (sometimes tens of seconds)
    // that skipping it is the difference between instant and "stuck".
    const matchesOriginal =
      player1Board &&
      activeRuns.every((run) =>
        run.every(({ x, y }) => board[y][x] === player1Board[y][x])
      );
    if (matchesOriginal) return { allFilled: true, isFullValid: true };

    const uniqueWords = [
      ...new Set(activeRuns.map((run) => run.map(({ x, y }) => board[y][x]).join(''))),
    ];

    // A Droid board is judged against the game's own word list and nothing
    // else. The generator only ships a board when countBoardSolutions finds
    // exactly one answer - but that search runs over these ~2,600 words, so
    // asking a full English dictionary whether a submission is valid asks a
    // different question than the one uniqueness was proved for. That gap is
    // how a board with "one combination" accepted a second, completely
    // different solution built from words the generator had never heard of.
    // Same vocabulary for both halves, and the guarantee holds again - with
    // the side benefit that judging a Droid board needs no network at all.
    if (boardAuthor === 'droid') {
      return { allFilled: true, isFullValid: uniqueWords.every(isKnownWord) };
    }

    // A human author is not restricted to that list, so their board has to
    // be judged against the real dictionary.
    setIsValidating(true);
    try {
      const results = await Promise.all(uniqueWords.map((w) => validateWord(w)));
      // Only a definite yes counts. A null means the dictionary could not be
      // reached, and awarding a solve on that basis marks made-up words
      // correct; falling back to exact-match scoring is the honest answer.
      return { allFilled: true, isFullValid: results.every((r) => r === true) };
    } finally {
      setIsValidating(false);
    }
  };

  // Compute correct tiles and transition to the end screen.
  const applyRoundResult = (isFullValid) => {
    finalizingRef.current = true;
    setPlayer2FullValid(isFullValid);
    resultFeedback(isFullValid);

    let correct;
    if (isFullValid && isTimedComputerGame) {
      // A timed round charges 0.3 per tile that differs from the author's
      // grid, so painting every tile green on a valid-but-different board
      // put the colours and the score in flat contradiction: all correct,
      // yet "- 3.3 wrong place". Green means "same as the author's tile"
      // here, which is exactly what the penalty counts.
      correct = checkCorrectTiles(board, player1Board);
    } else if (isFullValid) {
      // Untimed scoring awards the whole board for any valid solution, so
      // every active tile really is correct.
      const seen = new Set();
      correct = [];
      getActiveRuns(boardShape).flat().forEach(({ x, y }) => {
        const key = `${x},${y}`;
        if (!seen.has(key)) { seen.add(key); correct.push({ x, y }); }
      });
    } else {
      // Only tiles that match player 1's exact placement score
      correct = checkCorrectTiles(board, player1Board);
    }

    setCorrectTiles(correct);
    setValidationError(null);
    setGameState('end');
    setSelectedLetter(null);
    if (dailyMode) {
      localStorage.setItem(DAILY_STORAGE_KEY, todayString());
      setDailyPlayed(true);
    }
  };

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

        // Only a definite no blocks the turn: if the dictionary cannot be
        // reached the word is left alone rather than rejected, so a flaky
        // API never traps a player who has built a perfectly good board.
        const badWords = new Set(results.filter((r) => r.valid === false).map((r) => r.word));

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
          resultFeedback(false);
          return;
        }
      } finally {
        setIsValidating(false);
      }

      const p1Board = board.map((r) => [...r]);
      const fiveLetterWord = extractFiveLetterWord(p1Board, boardShape);
      const combCount = countBoardCombinations(boardShape, fiveLetterWord, countLetters(p1Board));
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(p1Board, 2, boardShape);
      const shareOrigin = isNative()
        ? SHARE_BASE_URL
        : `${window.location.origin}${window.location.pathname}`;
      const url = `${shareOrigin}?g=${encodeShareParam(p1Board, preservedLetters, boardShape)}`;
      setPlayer1Board(p1Board);
      setPreservedTiles(preservedLetters);
      setStarterPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(p1Board));
      setShareLink(url);
      setCombinationCount(combCount);
      setHintWord(makeWordHint(fiveLetterWord));
      setGameState('share');
      setSelectedLetter(null);
    } else {
      const { allFilled, isFullValid } = await validateSolverBoard();

      // In timed Droid v Human, a wrong submission doesn't end the game —
      // the player is told it's incorrect and play resumes until they solve
      // it or the score reaches 0.
      if (isTimedComputerActive && !isFullValid) {
        setValidationError(
          allFilled
            ? "Not quite — one or more words aren't valid. Keep trying!"
            : 'Fill every tile with valid words before submitting.'
        );
        return;
      }

      applyRoundResult(isFullValid);
    }
  };

  const resetGhostState = () => {
    setGhostMode(false);
    setGhostLetterQueue([]);
    setGhostCurrentIndex(0);
    setGhostShiftPromptMilestone(null);
    setGhostShiftUsedMilestones([]);
    setGhostAction(null);
    setGhostActionTile(null);
  };

  // Full reset including session
  const resetGame = () => {
    setBoard(emptyBoard());
    setPlayer1Board(null);
    setCurrentPlayer(1);
    setPreservedTiles([]);
    setStarterPreservedTiles([]);
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
    setTimedAutoReveals(0);
    setTimerSeconds(0);
    setReadingSecondsLeft(0);
    finalizingRef.current = false;
    setBoardShape('droid');
    setBoardAuthor('droid');
    setPendingMode(null);
    setPlayer2FullValid(false);
    setCombinationCount(null);
    setHintWord(null);
    setWordHintUsed(false);
    setChallenge(null);
    setSessionPlayedShapes([]);
    setSessionScores({});
    resetGhostState();
    setIsPaused(false);
    setShowLeaderboard(false);
    setShowPaymentModal(false);
    setGameState('start');
  };

  const revealCorrectLetter = ({ countAsHint = true } = {}) => {
    if (!player1Board) return;

    const preferredCandidates = [];
    const fallbackCandidates = [];
    player1Board.forEach((row, y) =>
      row.forEach((letter, x) => {
        if (letter && !preservedTiles.some((t) => t.x === x && t.y === y)) {
          const candidate = { x, y, letter };
          if (board[y][x] === letter) fallbackCandidates.push(candidate);
          else preferredCandidates.push(candidate);
        }
      })
    );

    const candidates = preferredCandidates.length > 0 ? preferredCandidates : fallbackCandidates;
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
    setPreservedTiles((prev) => [...prev, { x: chosen.x, y: chosen.y, letter: chosen.letter }]);
    if (countAsHint) setLetterHintsUsed((prev) => prev + 1);
  };

  const handleLetterHint = () => {
    if (isReadingTime) return;
    if (isPaused) return;
    revealCorrectLetter({ countAsHint: true });
  };

  // ── Ghost mode: place current letter on a tile ─────────────────────────
  const handleGhostTileClick = (x, y) => {
    if (removedSquares.has(y * 5 + x + 1)) return;
    if (preservedTiles.some((t) => t.x === x && t.y === y)) return;
    if (ghostShiftQuestionVisible && !ghostShiftSwapActive) return;

    if (ghostAction === 'shift-swap-select-first') {
      if (!board[y][x]) return;
      setGhostActionTile({ x, y, letter: board[y][x] });
      setGhostAction('shift-swap-select-second');
      return;
    }

    if (ghostAction === 'shift-swap-select-second') {
      const { x: ax, y: ay, letter } = ghostActionTile;
      if (ax === x && ay === y) {
        setGhostAction('shift-swap-select-first');
        setGhostActionTile(null);
        return;
      }

      const newBoard = board.map((r) => [...r]);
      const destinationLetter = newBoard[y][x];
      newBoard[y][x] = letter;
      newBoard[ay][ax] = destinationLetter || null;
      setBoard(newBoard);
      if (ghostShiftPromptMilestone !== null) {
        setGhostShiftUsedMilestones((prev) => [...prev, ghostShiftPromptMilestone]);
      }
      setGhostShiftPromptMilestone(null);
      setGhostAction(null);
      setGhostActionTile(null);
      setGhostCurrentIndex((prev) => prev + 1);
      return;
    }

    // Allow un-placing the current letter by clicking it again (so player can reposition)
    if (ghostLetterPlaced && board[y][x] === ghostCurrentLetter && !preservedTiles.some((t) => t.x === x && t.y === y)) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
      return;
    }

    // Normal ghost placement: place the current letter on an empty tile
    if (!ghostCurrentLetter || ghostLetterPlaced) return;
    if (board[y][x]) return; // tile already filled

    const newBoard = board.map((r) => [...r]);
    newBoard[y][x] = ghostCurrentLetter;
    setBoard(newBoard);
  };

  // Ghost: advance to next letter
  const handleGhostNextLetter = () => {
    if (!ghostLetterPlaced) return;
    if (ghostDueShiftMilestone !== null) {
      setGhostShiftPromptMilestone(ghostDueShiftMilestone);
      return;
    }
    setGhostCurrentIndex((prev) => prev + 1);
  };

  const handleGhostShiftSwapYes = () => {
    if (ghostActiveShiftMilestone === null) return;
    setGhostShiftPromptMilestone(ghostActiveShiftMilestone);
    setGhostAction('shift-swap-select-first');
    setGhostActionTile(null);
  };

  const handleGhostShiftSwapNo = () => {
    if (ghostActiveShiftMilestone !== null) {
      setGhostShiftUsedMilestones((prev) => [...prev, ghostActiveShiftMilestone]);
    }
    setGhostShiftPromptMilestone(null);
    setGhostAction(null);
    setGhostActionTile(null);
    setGhostCurrentIndex((prev) => prev + 1);
  };

  // Ghost: finish game — trigger scoring
  const handleGhostFinish = async () => {
    const activeRuns = getActiveRuns(boardShape);
    const allFilled = activeRuns.every((run) => run.every(({ x, y }) => board[y][x]));

    let isFullValid = false;
    let validWordSet = new Set();
    if (allFilled) {
      setIsValidating(true);
      try {
        const uniqueWords = [
          ...new Set(activeRuns.map((run) => run.map(({ x, y }) => board[y][x]).join(''))),
        ];
        const results = await Promise.all(uniqueWords.map((w) => validateWord(w)));
        isFullValid = results.every((r) => r === true);
        if (!isFullValid) validWordSet = new Set(uniqueWords.filter((_, i) => results[i] === true));
      } finally {
        setIsValidating(false);
      }
    }

    setPlayer2FullValid(isFullValid);
    resultFeedback(isFullValid);

    const seen = new Set();
    const correct = [];
    const addTile = (x, y) => {
      const key = `${x},${y}`;
      if (!seen.has(key)) { seen.add(key); correct.push({ x, y }); }
    };

    if (isFullValid) {
      activeRuns.flat().forEach(({ x, y }) => addTile(x, y));
    } else {
      // Award tiles in valid English words, plus tiles matching player1's placement
      activeRuns.forEach((run) => {
        if (validWordSet.has(run.map(({ x, y }) => board[y][x]).join('')))
          run.forEach(({ x, y }) => addTile(x, y));
      });
      checkCorrectTiles(board, player1Board).forEach(({ x, y }) => addTile(x, y));
    }

    setCorrectTiles(correct);
    setGameState('end');
  };

  // ── Derived end-screen data ───────────────────────────────────────────────

  const { score, rawScore, incorrectTiles, timePenalty, wrongPlacePenalty } = useMemo(() => {
    if (!player1Board || gameState !== 'end') {
      return { score: 0, rawScore: 0, incorrectTiles: [], timePenalty: 0, wrongPlacePenalty: 0 };
    }
    const preservedSet = new Set(preservedTiles.map((t) => `${t.x},${t.y}`));

    const exactWrongTiles = (() => {
      const arr = [];
      const removed = BOARD_SHAPES[boardShape]?.removed ?? BOARD_SHAPES.droid.removed;
      board.forEach((row, y) =>
        row.forEach((letter, x) => {
          const squareNum = y * 5 + x + 1;
          const isActive = !removed.has(squareNum);
          const isLockedHint = preservedSet.has(`${x},${y}`);
          if (isActive && !isLockedHint && player1Board?.[y]?.[x] && letter !== player1Board[y][x]) {
            arr.push({ x, y });
          }
        })
      );
      return arr;
    })();

    const incorrect = isTimedComputerScoring ? exactWrongTiles : player2FullValid ? [] : (() => {
      const correctSet = new Set(correctTiles.map((t) => `${t.x},${t.y}`));
      const arr = [];
      board.forEach((row, y) =>
        row.forEach((letter, x) => {
          const squareNum = y * 5 + x + 1;
          const removed = BOARD_SHAPES[boardShape]?.removed ?? BOARD_SHAPES.droid.removed;
          if (!removed.has(squareNum) && !preservedSet.has(`${x},${y}`) && !correctSet.has(`${x},${y}`)) {
            arr.push({ x, y });
          }
        })
      );
      return arr;
    })();

    const hintDeduction = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
    const wordHintDeduction = wordHintUsed ? 2 : 0;

    if (isTimedComputerScoring) {
      const raw = calcTimedComputerBaseScore(timerSeconds);
      const wp = Math.round(exactWrongTiles.length * WRONG_PLACE_PENALTY * 10) / 10;
      const s = Math.min(
        TIMED_COMPUTER_MAX_SCORE,
        Math.max(0, Math.round((raw - hintDeduction - wordHintDeduction - wp) * 10) / 10)
      );
      return { score: s, rawScore: raw, incorrectTiles: incorrect, timePenalty: 0, wrongPlacePenalty: wp };
    }

    const correctTileCount = player2FullValid
      ? maxScore
      : Math.min(correctTiles.filter((t) => !preservedSet.has(`${t.x},${t.y}`)).length, maxScore);

    if (ghostMode) {
      const raw = Math.round((correctTileCount / Math.max(1, maxScore)) * GHOST_SCORE_MAX * 10) / 10;
      const s = Math.min(GHOST_SCORE_MAX, Math.max(0, Math.round((raw - hintDeduction - wordHintDeduction) * 10) / 10));
      return { score: s, rawScore: raw, incorrectTiles: incorrect, timePenalty: 0, wrongPlacePenalty: 0 };
    }

    const raw = correctTileCount;
    const tp = timerEnabled ? calcTimePenalty(timerSeconds, boardShape) : 0;
    const s = Math.min(maxScore, Math.max(0, Math.round((raw - hintDeduction - wordHintDeduction - tp) * 10) / 10));

    return { score: s, rawScore: raw, incorrectTiles: incorrect, timePenalty: tp, wrongPlacePenalty: 0 };
  }, [board, player1Board, correctTiles, preservedTiles, gameState, letterHintsUsed, timerSeconds, maxScore, player2FullValid, boardShape, hintPenalty, wordHintUsed, timerEnabled, isTimedComputerScoring, ghostMode]);

  const scoreMax = isTimedComputerScoring || ghostMode ? GHOST_SCORE_MAX : maxScore;
  const scorePercent = scoreMax > 0 ? Math.round(score / scoreMax * 100) : 0;
  const challengeResult = challenge && gameState === 'end'
    ? (() => {
        const targetScore = Number(challenge.score);
        const targetSeconds = Number(challenge.seconds);
        const beatScore = score > targetScore;
        const tiedScore = score === targetScore;
        const beatTime = Number.isFinite(targetSeconds) ? timerSeconds < targetSeconds : false;
        return {
          won: beatScore || (tiedScore && beatTime),
          tiedScore,
          targetScore,
          targetSeconds,
        };
      })()
    : null;
  const challengeScoreLabel = challenge
    ? challenge.scoring === 'timed'
      ? Number(challenge.score).toFixed(1)
      : `${Math.round(challenge.scorePercent ?? (challenge.score / challenge.maxScore) * 100)}%`
    : null;

  // ── Live score (player 2 turn) ────────────────────────────────────────────
  const liveTimePenalty = timerEnabled ? calcTimePenalty(timerSeconds, boardShape) : 0;
  const hintDeductionLive = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
  const wordHintDeductionLive = wordHintUsed ? 2 : 0;
  const ghostPlacedCorrectCount = ghostMode && player1Board
    ? board.reduce((total, row, y) => total + row.reduce((rowTotal, letter, x) => {
        const squareNum = y * 5 + x + 1;
        const isActive = !removedSquares.has(squareNum);
        const isLocked = preservedTiles.some((t) => t.x === x && t.y === y);
        return rowTotal + (isActive && !isLocked && letter && letter === player1Board[y]?.[x] ? 1 : 0);
      }, 0), 0)
    : 0;
  const ghostLiveScore = Math.max(
    0,
    Math.min(
      GHOST_SCORE_MAX,
      Math.round(((ghostPlacedCorrectCount / Math.max(1, maxScore)) * GHOST_SCORE_MAX - hintDeductionLive - wordHintDeductionLive) * 10) / 10
    )
  );
  const liveScoreMax = isTimedComputerActive || gameState === 'ghost' ? GHOST_SCORE_MAX : maxScore;
  const liveScore = gameState === 'ghost'
    ? ghostLiveScore
    : isTimedComputerActive
      ? Math.max(0, Math.round((calcTimedComputerBaseScore(timerSeconds) - hintDeductionLive - wordHintDeductionLive) * 10) / 10)
      : Math.max(0, Math.round((maxScore - hintDeductionLive - wordHintDeductionLive - liveTimePenalty) * 10) / 10);
  const liveScoreClass = getScoreColorClass(liveScore, liveScoreMax);
  const livePercent = liveScoreMax > 0 ? Math.round(liveScore / liveScoreMax * 100) : 0;
  const liveScoreLabel = isTimedComputerActive || gameState === 'ghost' ? liveScore.toFixed(1) : `${livePercent}%`;

  // Session average across completed droids
  const sessionScoreValues = Object.values(sessionScores);
  const sessionTotal = sessionScoreValues.length > 0
    ? Math.round(sessionScoreValues.reduce((a, b) => a + b, 0) / sessionScoreValues.length)
    : 0;
  const sessionCount = sessionPlayedShapes.length;
  // Player 2 solving a board someone else authored - Droid or human alike.
  const isSolvingScreen = gameState === 'player2' && currentPlayer === 2 && vsComputer && !ghostMode;
  const isGhostDroidScreen = gameState === 'ghost';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="game-container">
      {/* Lightning payment modal */}
      {showPaymentModal && (
        <PaymentModal
          onPaid={() => { setShowPaymentModal(false); handleModeSelect('computer'); }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Leaderboard overlay — sits above everything */}
      {showLeaderboard && (
        <Leaderboard
          date={todayString()}
          shape={boardShape || dailyShape()}
          score={gameState === 'end' && dailyMode ? score : 0}
          maxScore={gameState === 'end' && dailyMode ? scoreMax : 0}
          canSubmit={gameState === 'end' && dailyMode && !dailyScoreSubmitted}
          onSubmitted={() => setDailyScoreSubmitted(true)}
          onClose={() => setShowLeaderboard(false)}
          onHome={resetGame}
        />
      )}

      {gameState !== 'start' && gameState !== 'preparingDaily' && gameState !== 'selectShape' && !isSolvingScreen && !isGhostDroidScreen && (
        <header className="site-header">
          <button className="site-header-title" onClick={resetGame}>Droid</button>
        </header>
      )}

      {gameState === 'start' && (
        <StartScreen
          onStart={() => handleModeSelect('player1')}
          onStartVsComputer={() => handleModeSelect('daily')}
          onStartCustomVsComputer={() => setShowPaymentModal(true)}
          onStartGhost={() => handleModeSelect('ghost')}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowHowToPlay={() => setShowHowToPlay(true)}
          dailyPlayed={dailyPlayed}
          hideLightning={isNative()}
        />
      )}

      {showHowToPlay && (
        <HowToPlay
          onClose={() => setShowHowToPlay(false)}
          hideLightning={isNative()}
        />
      )}

      {gameState === 'preparingDaily' && (
        <div className="start-screen preparing-droid-screen">
          <div className="dvh-panel preparing-droid-panel">
            <div className="dvh-topbar">
              <button className="dvh-home-button" onClick={resetGame} aria-label="Back to home screen">
                D
              </button>
              <div className="dvh-meta-strip preparing-droid-title">
                <span>DROID v HUMAN</span>
              </div>
            </div>
            <div className="home-tagline">
              {isPreparingDaily ? 'Preparing Droid...' : 'Loading Droid...'}
            </div>
          </div>
        </div>
      )}

      {gameState === 'selectShape' && (
        <ShapeSelection
          onSelect={handleShapeSelect}
          onBack={resetGame}
          sessionPlayedShapes={sessionPlayedShapes}
          sessionScores={sessionScores}
          sessionTotal={sessionTotal}
          sessionCount={sessionCount}
        />
      )}

      {(gameState === 'player1' || gameState === 'player2') && (
        <div className={`game-play${isSolvingScreen ? ' droid-human-play' : ''}`}>
          {isPaused && !isSolvingScreen && (
            <div className="pause-overlay">
              <div className="pause-bg">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`pause-silhouette pause-silhouette-${i}`}>
                    {BOARD_SHAPES[boardShape].grid.flat().map((cell, j) => (
                      <div key={j} className={cell ? 'ps-cell ps-cell-on' : 'ps-cell'} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="pause-modal">
                <div className="pause-title">Game Paused</div>
                <button className="button primary" onClick={() => setIsPaused(false)}>Resume</button>
              </div>
            </div>
          )}
          {isValidating && (
            <div className="validation-loading">
              <div className="spinner" />
              Checking words…
            </div>
          )}

          {validationError && !isValidating && (
            <div className="validation-error">{validationError}</div>
          )}

          {isSolvingScreen ? (
            <div className={`dvh-panel${isPaused ? ' is-paused' : ''}`}>
              <div className="dvh-topbar">
                <button className="dvh-home-button" onClick={resetGame} aria-label="Back to home screen">
                  D
                </button>
                <div className={`live-score-badge dvh-score ${liveScoreClass}`}>
                  <span className="live-score-grade">{liveScoreLabel}</span>
                  <span className="live-score-pts">score</span>
                </div>
                <button className="dvh-pause-button" onClick={() => setIsPaused((prev) => !prev)}>
                  <span>{isPaused ? 'Restart Game' : isReadingTime ? 'Game Starts' : 'Pause Game'}</span>
                  {isReadingTime && !isPaused && (
                    /* Re-keyed each tick so the pulse replays every second. */
                    <small key={readingSecondsLeft} className="dvh-countdown">
                      in {readingSecondsLeft}s
                    </small>
                  )}
                </button>
              </div>

              <div className="dvh-meta-strip">
                <span>{BOARD_SHAPES[boardShape]?.name || 'Droid'}</span>
                <span>{todayString()}</span>
                {/* A timed round is scored on the clock alone, so hiding the
                    clock leaves the player no way to see the score falling. */}
                {timerEnabled && (
                  <span className="dvh-elapsed">{formatElapsedTime(timerSeconds)}</span>
                )}
              </div>

              {challenge && (
                <div className="challenge-target-badge dvh-challenge">
                  <span className="challenge-target-label">Beat</span>
                  <span className="challenge-target-score">{challengeScoreLabel}</span>
                  <span className="challenge-target-time">Time {formatElapsedTime(challenge.seconds)}</span>
                </div>
              )}

              {wordHintUsed && hintWord && (
                <div className="hint-word-display dvh-hint-display">
                  Hint: {hintWord}
                </div>
              )}

              <div className={`dvh-board-frame${isPaused ? ' is-masked' : ''}`}>
                <GameBoard
                  board={board}
                  onTileClick={handleBoardTileClick}
                  preservedTiles={preservedTiles}
                  correctTiles={[]}
                  incorrectTiles={[]}
                  invalidWordTiles={invalidWordTiles}
                  selectedLetter={selectedLetter}
                  selectedTile={null}
                  currentPlayer={currentPlayer}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  interactive={!isReadingTime && !isPaused}
                  removedSquares={removedSquares}
                />
                {isPaused && <div className="dvh-pause-ribbon">Game Paused</div>}
              </div>

              <div className={`dvh-letter-panel${isPaused ? ' is-masked' : ''}`}>
                <div className="dvh-section-title">Letters Displayed</div>
                <LetterSelection
                  availableLetters={availableLetters}
                  selectedLetter={selectedLetter}
                  selectedIndex={selectedPoolIndex}
                  capacity={poolCapacity}
                  onLetterClick={handleLetterClick}
                  onDragStart={handleDragStart}
                />
              </div>

              <Button onClick={handleEndTurn} primary disabled={isValidating || isReadingTime || isPaused}>
                {isValidating ? 'Checking…' : 'Submit'}
              </Button>
            </div>
          ) : (
            <>
              {/* The Droid screen has its own topbar (and its own way home);
                  this branch - Play Human, both turns - had neither, so the
                  only way back to the menu was finishing or reloading. */}
              <div className="play-topbar">
                <button
                  className="play-home-button"
                  onClick={resetGame}
                  aria-label="Back to home screen"
                >
                  D
                </button>
                <div className="play-topbar-copy">
                  <span className="play-topbar-title">
                    {currentPlayer === 1 ? 'Build the Grid' : 'Solve the Grid'}
                  </span>
                  <span className="play-topbar-sub">
                    {BOARD_SHAPES[boardShape]?.name || 'Droid'}
                    {' · '}
                    {currentPlayer === 1 ? 'Player 1' : 'Player 2'}
                  </span>
                </div>
              </div>

              {currentPlayer === 2 && (
                <>
                  <div className="live-hud">
                    <div className={`live-score-badge ${liveScoreClass}`}>
                      <span className="live-score-grade">{liveScoreLabel}</span>
                      <span className="live-score-pts">{isTimedComputerActive ? 'current score' : 'max achievable'}</span>
                    </div>
                    {challenge && (
                      <div className="challenge-target-badge">
                        <span className="challenge-target-label">Beat</span>
                        <span className="challenge-target-score">{challengeScoreLabel}</span>
                        <span className="challenge-target-time">Time {formatElapsedTime(challenge.seconds)}</span>
                      </div>
                    )}
                  </div>
                  {isReadingTime && (
                    <div className="reading-time-banner">
                      <span className="reading-time-title">Reading Time</span>
                      <span className="reading-time-count">{readingSecondsLeft}</span>
                    </div>
                  )}
                  {wordHintUsed && hintWord && (
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
                interactive={!isReadingTime}
                removedSquares={removedSquares}
              />

              <LetterSelection
                availableLetters={availableLetters}
                selectedLetter={selectedLetter}
                selectedIndex={selectedPoolIndex}
                capacity={poolCapacity}
                onLetterClick={handleLetterClick}
                onDragStart={handleDragStart}
              />

              <div className="actions">
                <div className="hint-actions">
                  <button className="hint-btn" onClick={handleClearBoard} disabled={isReadingTime}>
                    Clear board
                  </button>
                  {currentPlayer === 2 && (
                    <button className="hint-btn letter-hint-btn" onClick={handleLetterHint} disabled={isReadingTime}>
                      Reveal letter −{hintPenalty}pt
                    </button>
                  )}
                  {currentPlayer === 2 && !wordHintUsed && hintWord && (
                    <button className="hint-btn letter-hint-btn" onClick={() => setWordHintUsed(true)} disabled={isReadingTime}>
                      Word hint −2pt
                    </button>
                  )}
                  {currentPlayer === 2 && timerEnabled && (
                    <button className="hint-btn pause-btn" onClick={() => setIsPaused(true)}>
                      Pause
                    </button>
                  )}
                </div>
                <Button onClick={handleEndTurn} primary disabled={isValidating || isReadingTime}>
                  {isValidating ? 'Checking…' : currentPlayer === 1 ? 'End Turn' : 'Finish'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {gameState === 'ghost' && (
        <div className="game-play droid-human-play ghost-droid-play">
          {isValidating && (
            <div className="validation-loading">
              <div className="spinner" />
              Checking words…
            </div>
          )}

          <div className={`dvh-panel ghost-panel${isPaused ? ' is-paused' : ''}`}>
            <div className="dvh-topbar">
              <button className="dvh-home-button" onClick={resetGame} aria-label="Back to home screen">
                D
              </button>
              <div className={`live-score-badge dvh-score ${liveScoreClass}`}>
                <span className="live-score-grade">{liveScoreLabel}</span>
                <span className="live-score-pts">score earned</span>
              </div>
              <button className="dvh-pause-button" onClick={() => setIsPaused((prev) => !prev)}>
                {isPaused ? 'Resume' : 'Pause'}
                <small>Game</small>
              </button>
            </div>

            <div className="dvh-meta-strip ghost-meta-strip">
              <span>Ghost Droid</span>
              <span>{todayString()}</span>
            </div>

            {ghostShiftQuestionVisible ? (
              <div className={`ghost-shift-row${ghostShiftSwapActive ? ' is-selecting' : ''}`}>
                <div className="ghost-shift-question">
                  {ghostShiftSwapActive
                    ? ghostAction === 'shift-swap-select-first'
                      ? 'Tap a letter to shift or swap'
                      : 'Tap where it should go'
                    : 'Do you want to shift or swap?'}
                </div>
                <div className="ghost-shift-choice-stack">
                  <button
                    className={`ghost-shift-choice${ghostShiftSwapActive ? ' is-active' : ''}`}
                    onClick={handleGhostShiftSwapYes}
                    disabled={ghostShiftSwapActive}
                  >
                    Yes
                  </button>
                  <button className="ghost-shift-choice" onClick={handleGhostShiftSwapNo}>
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className={`ghost-next-row${ghostCanAdvance ? ' can-advance' : ''}${ghostAllPlaced ? ' all-placed' : ''}`}>
                <button
                  className="ghost-next-button"
                  onClick={handleGhostNextLetter}
                  disabled={!ghostCanAdvance}
                >
                  {ghostAllPlaced || ghostCanSubmit ? 'Ready to submit' : ghostCanAdvance ? 'Next letter' : 'Next letter'}
                </button>
                <div className={`ghost-current-letter${ghostLetterPlaced ? ' placed' : ''}`}>
                  {ghostAllPlaced ? '✓' : ghostCurrentLetter}
                </div>
              </div>
            )}

            {ghostAction && (
              <div className="ghost-action-prompt">
                {ghostAction === 'shift-swap-select-first' && 'First tap: choose a placed letter'}
                {ghostAction === 'shift-swap-select-second' && 'Second tap: choose an empty space or another letter'}
              </div>
            )}

            <div className={`dvh-board-frame ghost-board-frame${isPaused ? ' is-masked' : ''}`}>
              <GameBoard
                board={board}
                onTileClick={handleGhostTileClick}
                preservedTiles={preservedTiles}
                correctTiles={[]}
                incorrectTiles={[]}
                invalidWordTiles={[]}
                selectedLetter={(!ghostAllPlaced && !ghostLetterPlaced && !ghostAction) ? ghostCurrentLetter : null}
                selectedTile={ghostActionTile}
                currentPlayer={2}
                onDragStart={() => {}}
                onDrop={() => {}}
                interactive={!isPaused && (!ghostShiftQuestionVisible || ghostShiftSwapActive)}
                removedSquares={removedSquares}
              />
              {isPaused && <div className="dvh-pause-ribbon">Game Paused</div>}
            </div>

            <Button
              onClick={handleGhostFinish}
              primary
              disabled={isValidating || isPaused || !ghostCanSubmit}
            >
              {isValidating ? 'Checking…' : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      {gameState === 'share' && (
        <div className="share-panel">
          <button className="back-to-menu-btn back-to-menu-top" onClick={resetGame}>
            ← Back to Menu
          </button>

          <div className="share-header">
            <h2>Turn Complete!</h2>
            <p className="share-subtext">
              Send this link to Player 2. They can open it on any device — no login needed.
            </p>
          </div>
          <div className="share-url-row">
            <span className="share-url-text">{shareLink}</span>
          </div>
          <div className="share-buttons">
            <NativeShareButton
              url={shareLink}
              title="Play this Droid"
              text="I made a Droid board for you to solve."
            />
            <CopyButton url={shareLink} />
          </div>
          <div className="share-actions">
            <Button
              primary
              onClick={() => beginSolvingTurn({ author: 'human', timed: timerEnabled })}
            >
              Play on this device instead
            </Button>
          </div>

        </div>
      )}

      {gameState === 'end' && (() => {
        const thisScoreClass = getScoreColorClass(score, scoreMax);
        const hintDeduction = Math.round(letterHintsUsed * hintPenalty * 10) / 10;
        const wordHintDeduction = wordHintUsed ? 2 : 0;
        const hasPenalties = letterHintsUsed > 0 || wordHintUsed || timePenalty > 0 || wrongPlacePenalty > 0;
        const allPlayed = [...sessionPlayedShapes, boardShape];
        const allScores = { ...sessionScores, [boardShape]: scorePercent };
        const allScoreValues = Object.values(allScores);
        const combinedTotal = allScoreValues.length > 0
          ? Math.round(allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length)
          : 0;
        const gamesPlayed = allPlayed.length;
        const answerScoreLabel = isTimedComputerScoring ? score.toFixed(1) : `${scorePercent}%`;
        const answerScoreMeta = `${score}/${scoreMax} pts · ${BOARD_SHAPES[boardShape]?.name}`;

        return (
          <div className="end-screen answer-screen">
            <div className={`answer-panel${isTimedComputerScoring ? ' has-outcome' : ''}`}>
              <div className="dvh-topbar answer-topbar">
                <button className="dvh-home-button" onClick={resetGame} aria-label="Back to home screen">
                  D
                </button>
                <div className={`live-score-badge dvh-score answer-score ${thisScoreClass}`}>
                  <span className="live-score-grade">{answerScoreLabel}</span>
                  <span className="live-score-pts">score</span>
                </div>
                <button className="dvh-pause-button answer-leaderboard-button" onClick={() => setShowLeaderboard(true)}>
                  <span>Leader board</span>
                </button>
              </div>

              <div className="dvh-meta-strip answer-meta-strip">
                <span>{BOARD_SHAPES[boardShape]?.name || 'Droid'}</span>
                <span>{todayString()}</span>
              </div>

              {/* A timed round is scored on the clock alone, so a perfectly
                  solved board still shows 0.0 once the timer has run it down,
                  and the penalty summary below stays hidden because the time
                  is baked into the base score rather than counted as a
                  penalty. Without this line that reads as the game calling a
                  correct board wrong. */}
              {isTimedComputerScoring && (
                <div className={`answer-outcome${player2FullValid ? ' is-solved' : ' is-unsolved'}`}>
                  <strong>
                    {player2FullValid ? '✓ Board solved' : 'Board not solved'}
                    {' · '}
                    {formatElapsedTime(timerSeconds)}
                  </strong>
                  {player2FullValid && score === 0 && (
                    <small>
                      Your board is correct — the clock ran the score down to 0
                      before you finished.
                    </small>
                  )}
                </div>
              )}

              {(hasPenalties || challengeResult || (!dailyMode && gamesPlayed > 1)) && (
                <div className="answer-summary">
                  {!dailyMode && gamesPlayed > 1 && (
                    <div className="session-combined">
                      Average score ({gamesPlayed} droids): {combinedTotal}%
                    </div>
                  )}
                  <div className="score-label">{answerScoreMeta}</div>
                  {hasPenalties && (
                    <div className="score-penalty">
                      {rawScore}/{scoreMax}
                      {letterHintsUsed > 0 && ` - ${hintDeduction} hint${letterHintsUsed !== 1 ? 's' : ''}`}
                      {wordHintUsed && ` - ${wordHintDeduction} word hint`}
                      {timePenalty > 0 && ` - ${timePenalty} time`}
                      {wrongPlacePenalty > 0 && ` - ${wrongPlacePenalty} wrong place`}
                      {' '}= {score}/{scoreMax}
                    </div>
                  )}
                  {challengeResult && (
                    <div className={`challenge-result ${challengeResult.won ? 'challenge-won' : 'challenge-lost'}`}>
                      <span className="challenge-result-kicker">Challenge result</span>
                      <strong>{challengeResult.won ? 'You won' : 'You lost'}</strong>
                      <small>
                        You: {answerScoreLabel} in {formatElapsedTime(timerSeconds)}
                        {' · '}
                        Target: {challengeScoreLabel} in {formatElapsedTime(challengeResult.targetSeconds)}
                      </small>
                    </div>
                  )}
                </div>
              )}

              <div className="answer-board-panel">
                {/* Same straight apostrophe the Droid heading has always
                    used - this line must render byte-identically for a
                    Droid board. */}
                <div className="answer-board-heading">
                  {boardAuthor === 'human' ? "Player 1's Answer" : "Droid's Answer"}
                </div>
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

              <div className="answer-board-panel answer-player-panel">
                <div className="answer-board-heading">Your Answer</div>
                <div className="legend answer-legend">
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

            <button className="back-to-menu-btn answer-back-btn" onClick={resetGame}>
              ← Back to Menu
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default DroidGame;
