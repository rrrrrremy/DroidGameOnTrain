import { saveDailyProgress, readDailyProgress, clearDailyProgress } from './dailyProgress';

const emptyBoard = () => Array(5).fill(null).map(() => Array(5).fill(null));

const sample = (overrides = {}) => {
  const board = emptyBoard();
  board[1][0] = 'A';
  board[1][1] = 'B';
  return {
    date: '2026-09-23',
    board,
    preservedTiles: [{ x: 0, y: 1, letter: 'A' }],
    timerSeconds: 94,
    letterHintsUsed: 1,
    wordHintUsed: false,
    timedAutoReveals: 1,
    ...overrides,
  };
};

beforeEach(() => localStorage.clear());

describe('daily progress', () => {
  test('a saved round comes back exactly as it was saved', () => {
    saveDailyProgress(sample());
    expect(readDailyProgress('2026-09-23')).toEqual(sample());
  });

  test("another day's round is never resumed", () => {
    saveDailyProgress(sample({ date: '2026-09-22' }));
    expect(readDailyProgress('2026-09-23')).toBeNull();
  });

  test('nothing saved means nothing to resume', () => {
    expect(readDailyProgress('2026-09-23')).toBeNull();
  });

  test('clearing removes it', () => {
    saveDailyProgress(sample());
    clearDailyProgress();
    expect(readDailyProgress('2026-09-23')).toBeNull();
  });

  test('a malformed save is ignored rather than trusted', () => {
    const bad = [
      sample({ board: [[null]] }),
      sample({ board: sample().board.map((row) => row.map(() => 'ab')) }),
      sample({ preservedTiles: [{ x: 9, y: 0 }] }),
      sample({ timerSeconds: -1 }),
      sample({ timerSeconds: 1.5 }),
      sample({ letterHintsUsed: '1' }),
      sample({ wordHintUsed: 'no' }),
    ];
    bad.forEach((progress) => {
      saveDailyProgress(progress);
      expect(readDailyProgress('2026-09-23')).toBeNull();
    });
  });

  test('unparseable storage is treated as no save', () => {
    localStorage.setItem('droid_daily_progress', '{not json');
    expect(readDailyProgress('2026-09-23')).toBeNull();
  });
});
