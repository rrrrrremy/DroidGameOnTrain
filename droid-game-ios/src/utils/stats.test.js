import { readHistory, recordDailyResult, computeStats, previousDay } from './stats';

const round = (score, extra = {}) => ({
  score, maxScore: 6, seconds: 120, hints: 0, wordHint: false, solved: true, ...extra,
});

const historyOf = (entries) => {
  localStorage.setItem('droid_daily_history', JSON.stringify(entries));
  return readHistory();
};

beforeEach(() => localStorage.clear());

describe('previousDay', () => {
  test('steps back across month and year ends', () => {
    expect(previousDay('2026-10-01')).toBe('2026-09-30');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });
});

describe('recordDailyResult', () => {
  test('saves a round and keeps the first record for a day', () => {
    recordDailyResult('2026-10-05', round(4.1));
    const after = recordDailyResult('2026-10-05', round(1.0));
    expect(after['2026-10-05'].score).toBe(4.1);
    expect(readHistory()['2026-10-05'].score).toBe(4.1);
  });

  test('refuses malformed records and dates', () => {
    expect(recordDailyResult('5 Oct', round(4))).toEqual({});
    expect(recordDailyResult('2026-10-05', { score: 'high' })).toEqual({});
  });

  test('malformed storage is ignored, not trusted', () => {
    localStorage.setItem('droid_daily_history', '{nope');
    expect(readHistory()).toEqual({});
    localStorage.setItem('droid_daily_history', JSON.stringify({ '2026-10-05': { score: -1 } }));
    expect(readHistory()).toEqual({});
  });
});

describe('computeStats', () => {
  test('nothing played', () => {
    expect(computeStats({}, '2026-10-05')).toEqual({
      currentStreak: 0, bestStreak: 0, played: 0, solved: 0,
      averageScore: null, bestTime: null, playedToday: false,
    });
  });

  test('a streak including today', () => {
    const h = historyOf({
      '2026-10-03': round(5), '2026-10-04': round(4), '2026-10-05': round(3),
    });
    const s = computeStats(h, '2026-10-05');
    expect(s.currentStreak).toBe(3);
    expect(s.bestStreak).toBe(3);
    expect(s.averageScore).toBe(4);
    expect(s.playedToday).toBe(true);
  });

  test('a streak stays alive while today is unplayed', () => {
    const h = historyOf({ '2026-10-03': round(5), '2026-10-04': round(4) });
    expect(computeStats(h, '2026-10-05').currentStreak).toBe(2);
  });

  test('a missed day ends it', () => {
    const h = historyOf({ '2026-10-02': round(5), '2026-10-03': round(4) });
    expect(computeStats(h, '2026-10-05').currentStreak).toBe(0);
    expect(computeStats(h, '2026-10-05').bestStreak).toBe(2);
  });

  test('an unsolved round still counts; a forfeit ends the streak', () => {
    const h = historyOf({
      '2026-10-02': round(5),
      '2026-10-03': round(0, { solved: false, seconds: 900 }),
      '2026-10-04': { forfeit: true },
      '2026-10-05': round(4),
    });
    const s = computeStats(h, '2026-10-05');
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(2);
    expect(s.played).toBe(3);
    expect(s.solved).toBe(2);
    expect(s.bestTime).toBe(120);
  });

  test('forfeiting today ends the streak straight away', () => {
    const h = historyOf({ '2026-10-04': round(5), '2026-10-05': { forfeit: true } });
    const s = computeStats(h, '2026-10-05');
    expect(s.currentStreak).toBe(0);
    expect(s.playedToday).toBe(true);
  });

  test('a streak runs across a month end', () => {
    const h = historyOf({
      '2026-09-29': round(5), '2026-09-30': round(5), '2026-10-01': round(5),
    });
    expect(computeStats(h, '2026-10-01').currentStreak).toBe(3);
  });
});
