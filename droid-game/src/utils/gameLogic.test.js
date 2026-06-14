import {
  checkCorrectTiles,
  countLetters,
  decodeShareParam,
  encodeShareParam,
  getActiveRuns,
  preserveRandomLettersForPlayer2,
} from './gameLogic';

const filledBoard = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O'],
  ['P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y'],
];

describe('game logic helpers', () => {
  test('active runs are produced for every shipped board shape', () => {
    ['droid', 'cross', 'invader', 'bolt'].forEach((shape) => {
      const runs = getActiveRuns(shape);

      expect(runs.length).toBeGreaterThan(0);
      expect(runs.every((run) => run.length >= 2)).toBe(true);
    });
  });

  test('share params round-trip board, preserved tiles, and shape', () => {
    const preserved = [
      { x: 0, y: 1 },
      { x: 2, y: 3 },
    ];
    const meta = {
      type: 'challenge',
      score: 5.2,
      maxScore: 6,
      seconds: 142,
      scoring: 'timed',
    };

    const token = encodeShareParam(filledBoard, preserved, 'cross', meta);
    const decoded = decodeShareParam(token);

    expect(decoded).toEqual({
      board: filledBoard,
      preserved,
      shape: 'cross',
      meta,
    });
  });

  test('old share params without challenge metadata still decode', () => {
    const oldRaw = `droid|${filledBoard.flat().join('')}|`;
    const token = btoa(oldRaw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const decoded = decodeShareParam(token);

    expect(decoded.board).toEqual(filledBoard);
    expect(decoded.preserved).toEqual([]);
    expect(decoded.shape).toBe('droid');
    expect(decoded.meta).toBeNull();
  });

  test('letter counting and correct-tile checks ignore empty cells safely', () => {
    const playerBoard = [
      ['A', null, 'C', null, null],
      [null, 'G', null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ];

    expect(countLetters(playerBoard)).toEqual({ A: 1, C: 1, G: 1 });
    expect(checkCorrectTiles(playerBoard, filledBoard)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  test('preserved letters are copied onto a clean player-two board', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(filledBoard, 2, 'droid');

      expect(preservedLetters).toEqual([
        { x: 0, y: 1, letter: 'F' },
        { x: 2, y: 2, letter: 'M' },
      ]);
      expect(newBoard[1][0]).toBe('F');
      expect(newBoard[2][2]).toBe('M');
      expect(newBoard.flat().filter(Boolean)).toEqual(['F', 'M']);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
