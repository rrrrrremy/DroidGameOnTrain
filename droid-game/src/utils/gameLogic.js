export const countLetters = (board) => {
  const counts = {};
  board.flat().forEach(letter => {
    if (letter) {
      counts[letter] = (counts[letter] || 0) + 1;
    }
  });
  return counts;
};

const isVowel = (letter) => ['A', 'E', 'I', 'O', 'U'].includes(letter);

export const preserveRandomLettersForPlayer2 = (board) => {
  const flatBoard = board.flat();
  const filledTiles = flatBoard.reduce((acc, letter, index) => {
    if (letter) acc.push({ x: index % 5, y: Math.floor(index / 5), letter });
    return acc;
  }, []);

  const vowels = filledTiles.filter(tile => isVowel(tile.letter));
  const consonants = filledTiles.filter(tile => !isVowel(tile.letter));

  const randomVowel = vowels[Math.floor(Math.random() * vowels.length)];
  const randomConsonant = consonants[Math.floor(Math.random() * consonants.length)];

  const preservedLetters = [randomVowel, randomConsonant].filter(Boolean);

  const newBoard = Array(5).fill().map(() => Array(5).fill(null));
  preservedLetters.forEach(({ x, y, letter }) => {
    newBoard[y][x] = letter;
  });

  return { preservedLetters, newBoard };
};

export const checkCorrectTiles = (board, player1Board) => {
  const correctTiles = [];
  board.forEach((row, y) => {
    row.forEach((letter, x) => {
      if (letter && letter === player1Board[y][x]) {
        correctTiles.push({ x, y });
      }
    });
  });
  return correctTiles;
};