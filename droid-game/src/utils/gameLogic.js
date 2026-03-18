// 1-indexed square numbers that are NOT playable (matches GameBoard)
const REMOVED_SQUARES = new Set([1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25]);
const isActiveSquare = (x, y) => !REMOVED_SQUARES.has(y * 5 + x + 1);

/**
 * Find all horizontal and vertical runs of 2+ consecutive filled letters
 * on active squares. Each run represents a word to validate.
 * Returns an array of runs, where each run is [{x, y, letter}, ...].
 */
export const extractWords = (board) => {
  const words = [];

  // Horizontal
  for (let y = 0; y < 5; y++) {
    let run = [];
    for (let x = 0; x <= 5; x++) {
      if (x < 5 && isActiveSquare(x, y) && board[y][x]) {
        run.push({ x, y, letter: board[y][x] });
      } else {
        if (run.length >= 2) words.push(run);
        run = [];
      }
    }
  }

  // Vertical
  for (let x = 0; x < 5; x++) {
    let run = [];
    for (let y = 0; y <= 5; y++) {
      if (y < 5 && isActiveSquare(x, y) && board[y][x]) {
        run.push({ x, y, letter: board[y][x] });
      } else {
        if (run.length >= 2) words.push(run);
        run = [];
      }
    }
  }

  return words;
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

const isVowel = (letter) => 'AEIOU'.includes(letter);

export const preserveRandomLettersForPlayer2 = (board) => {
  const filledTiles = [];
  board.forEach((row, y) =>
    row.forEach((letter, x) => {
      if (letter) filledTiles.push({ x, y, letter });
    })
  );

  const vowelTiles = filledTiles.filter((t) => isVowel(t.letter));
  const consonantTiles = filledTiles.filter((t) => !isVowel(t.letter));

  const pick = (arr) =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

  const preserved = [pick(vowelTiles), pick(consonantTiles)].filter(Boolean);

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
