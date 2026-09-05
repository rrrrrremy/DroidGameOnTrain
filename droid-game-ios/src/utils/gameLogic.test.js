import {
  checkCorrectTiles,
  countLetters,
  decodeShareParam,
  encodeShareParam,
  getActiveRuns,
  preserveRandomLettersForPlayer2,
  validateWord,
} from './gameLogic';
import englishWords from '../data/english-words.json';
import { isKnownWord } from './computerPlayer';

describe('offline word validation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => Promise.reject(new Error('Offline')));
  });

  afterEach(() => {
    expect(global.fetch).not.toHaveBeenCalled();
    global.fetch = originalFetch;
    localStorage.clear();
  });

  test('accepts words beyond the generator vocabulary without a connection', async () => {
    for (const word of ['QI', 'ZEBU', 'AIOLI']) {
      expect(isKnownWord(word)).toBe(false);
      expect(await validateWord(word.toLowerCase())).toBe(true);
    }
    expect(await validateWord('DROIT')).toBe(true);
  });

  test('rejects invented words immediately rather than timing out', async () => {
    expect(await Promise.all(['ZZ', 'QZX', 'DEEI', 'QZXWV'].map(validateWord)))
      .toEqual([false, false, false, false]);
  });

  test('accepts vetted additional words and excludes candidate names and abbreviations', async () => {
    for (const word of ['EMOJI', 'VAPE', 'VAPED', 'EJIDO', 'FUFU', 'LEFSE']) {
      expect(await validateWord(word)).toBe(true);
    }
    for (const word of ['AARON', 'ABBY', 'ABBR', 'ABC', 'KG', 'MG']) {
      expect(await validateWord(word)).toBe(false);
    }
  });

  test('old API verdicts cannot override the bundled dictionary', async () => {
    localStorage.setItem('droid_word_verdicts', JSON.stringify({ AIOLI: false, QZXWV: true }));
    expect(await validateWord('AIOLI')).toBe(true);
    expect(await validateWord('QZXWV')).toBe(false);
  });

  test('rejects malformed input and lengths that cannot fit a board slot', async () => {
    for (const word of ['', null, undefined, 123, {}, 'A', 'LONGER', 'A B', 'ICE-C', '123', 'café']) {
      expect(await validateWord(word)).toBe(false);
    }
  });

  test('the shipped dictionary contains only unique playable entries', () => {
    expect(englishWords.length).toBeGreaterThan(19000);
    expect(new Set(englishWords).size).toBe(englishWords.length);
    expect(englishWords.every((word) => /^[A-Z]{2,5}$/.test(word))).toBe(true);
  });
});

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
