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
