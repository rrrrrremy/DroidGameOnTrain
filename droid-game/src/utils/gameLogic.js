import { BOARD_SHAPES } from './computerPlayer';

/**
 * Return every contiguous run of 2+ active squares on the board
 * (i.e. the complete word slots — rows and columns — regardless of
 * whether they have letters on them yet).
 * Each run is an array of {x, y}.
 */
export const getActiveRuns = (shape = 'droid') => {
  const removed = BOARD_SHAPES[shape]?.removed ?? BOARD_SHAPES.droid.removed;
  const isActive = (x, y) => !removed.has(y * 5 + x + 1);
  const runs = [];

  // Horizontal
  for (let y = 0; y < 5; y++) {
    let run = [];
    for (let x = 0; x <= 5; x++) {
      if (x < 5 && isActive(x, y)) {
        run.push({ x, y });
      } else {
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    }
  }

  // Vertical
  for (let x = 0; x < 5; x++) {
    let run = [];
    for (let y = 0; y <= 5; y++) {
      if (y < 5 && isActive(x, y)) {
        run.push({ x, y });
      } else {
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    }
  }

  return runs;
};

/**
 * Check a single word against the Free Dictionary API.
 * Returns true if valid, false if not found.
 * Fails open (returns true) on network errors so connectivity issues
 * don't block play.
 */
export const validateWord = async (word) => {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
    );
    return res.ok;
  } catch {
    return true;
  }
};

export const countLetters = (board) => {
  const counts = {};
  board.flat().forEach((letter) => {
    if (letter) counts[letter] = (counts[letter] || 0) + 1;
  });
  return counts;
};

export const preserveRandomLettersForPlayer2 = (board, count = 2) => {
  const filledTiles = [];
  board.forEach((row, y) =>
    row.forEach((letter, x) => {
      if (letter) filledTiles.push({ x, y, letter });
    })
  );

  const shuffled = [...filledTiles].sort(() => Math.random() - 0.5);
  const preserved = shuffled.slice(0, Math.min(count, shuffled.length));

  const newBoard = Array(5)
    .fill(null)
    .map(() => Array(5).fill(null));
  preserved.forEach(({ x, y, letter }) => {
    newBoard[y][x] = letter;
  });

  return { preservedLetters: preserved, newBoard };
};

export const checkCorrectTiles = (board, player1Board) => {
  const correct = [];
  board.forEach((row, y) =>
    row.forEach((letter, x) => {
      if (letter && letter === player1Board[y][x]) correct.push({ x, y });
    })
  );
  return correct;
};

// ── URL encode / decode for async multiplayer ─────────────────────────────

const encodeBoard = (board) =>
  board.flat().map((cell) => cell ?? '.').join('');

const decodeBoard = (str) => {
  if (!str || str.length !== 25) return null;
  const flat = str.split('').map((c) => (c === '.' ? null : c.toUpperCase()));
  return [0, 1, 2, 3, 4].map((row) => flat.slice(row * 5, row * 5 + 5));
};

const encodePreserved = (tiles) =>
  tiles.map((t) => `${t.x}${t.y}`).join('');

const decodePreserved = (str) => {
  if (!str) return [];
  if (!/^([0-4]{2}){1,8}$/.test(str)) return [];
  const tiles = [];
  for (let i = 0; i < str.length; i += 2) {
    tiles.push({ x: parseInt(str[i], 10), y: parseInt(str[i + 1], 10) });
  }
  return tiles;
};

// Combine shape + board + preserved into a single opaque base64url token
export const encodeShareParam = (board, preserved, shape = 'droid') => {
  const raw = `${shape}|${encodeBoard(board)}|${encodePreserved(preserved)}`;
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const decodeShareParam = (token) => {
  if (!token) return null;
  try {
    const raw = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = raw.split('|');
    if (parts.length === 3) {
      // New format: shape|board|preserved
      const [shape, boardStr, preservedStr] = parts;
      const board = decodeBoard(boardStr);
      if (!board) return null;
      const preserved = decodePreserved(preservedStr ?? '');
      return { board, preserved, shape };
    } else if (parts.length === 2) {
      // Old format: board|preserved (backwards compat)
      const [boardStr, preservedStr] = parts;
      const board = decodeBoard(boardStr);
      if (!board) return null;
      const preserved = decodePreserved(preservedStr ?? '');
      return { board, preserved, shape: 'droid' };
    }
    return null;
  } catch {
    return null;
  }
};
