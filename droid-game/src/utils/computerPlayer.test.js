import {
  BOARD_SHAPES,
  SHAPE_IDS,
  countBoardCombinations,
  countBoardSolutions,
  dailyShape,
  extractFiveLetterWord,
  generateComputerBoard,
  generateDailyBoard,
  todayString,
} from './computerPlayer';

const activeTileCount = (shapeId) =>
  25 - BOARD_SHAPES[shapeId].removed.size;

const letterPoolFor = (board) =>
  board.flat().reduce((counts, letter) => {
    if (letter) counts[letter] = (counts[letter] || 0) + 1;
    return counts;
  }, {});

describe('computer board generation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('all configured shapes can generate playable boards', () => {
    SHAPE_IDS.forEach((shapeId) => {
      const result = generateComputerBoard(shapeId);

      expect(result).toBeTruthy();
      expect(result.board).toHaveLength(5);
      expect(result.board.every((row) => row.length === 5)).toBe(true);
      expect(result.board.flat().filter(Boolean)).toHaveLength(activeTileCount(shapeId));
      expect(result.fiveLetterWord).toMatch(/^[A-Z]{5}$/);
      expect(result.preservedLetters).toHaveLength(2);
      expect(extractFiveLetterWord(result.board, shapeId)).toBe(result.fiveLetterWord);
      expect(result.combinationCount).toBe(1);
    });
  });

  test('daily board generation is deterministic for each shape on the same day', () => {
    SHAPE_IDS.forEach((shapeId) => {
      const first = generateDailyBoard(shapeId);
      const second = generateDailyBoard(shapeId);

      expect(second).toEqual(first);
    });
  });

  test('generated computer boards have exactly one valid solution', () => {
    SHAPE_IDS.forEach((shapeId) => {
      const { board, fiveLetterWord, preservedLetters } = generateComputerBoard(shapeId);
      const letterPool = letterPoolFor(board);
      const combinations = countBoardCombinations(shapeId, fiveLetterWord, letterPool, preservedLetters);
      const solutions = countBoardSolutions(shapeId, letterPool, 2, preservedLetters);

      expect(combinations).toBe(1);
      expect(solutions).toBe(1);
    });
  });

  test('daily boards have exactly one valid solution', () => {
    SHAPE_IDS.forEach((shapeId) => {
      const { board, preservedLetters } = generateDailyBoard(shapeId);
      const solutions = countBoardSolutions(shapeId, letterPoolFor(board), 2, preservedLetters);

      expect(solutions).toBe(1);
    });
  });

  test('daily metadata stays in the expected public formats', () => {
    expect(SHAPE_IDS).toContain(dailyShape());
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
