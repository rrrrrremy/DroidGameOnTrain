/**
 * The daily round in progress, saved as it is played.
 *
 * A round used to live only in memory, so closing the app and reopening it
 * put the player back at a fresh start: the same daily puzzle, a clock back
 * at zero, and letters they had already seen. Saving the round as it goes
 * means reopening carries it on instead. That closes the restart without
 * costing an honest player their day when iOS kills the app in the
 * background, or it crashes.
 *
 * Only what the player has done is kept here. The puzzle itself is rebuilt
 * from the daily seed on resume, exactly as it was built the first time.
 */
const KEY = 'droid_daily_progress';

const isLetter = (c) => typeof c === 'string' && /^[A-Z]$/.test(c);

const isBoard = (b) =>
  Array.isArray(b) &&
  b.length === 5 &&
  b.every(
    (row) =>
      Array.isArray(row) && row.length === 5 && row.every((c) => c === null || isLetter(c))
  );

const isTileList = (tiles) =>
  Array.isArray(tiles) &&
  tiles.every(
    (t) =>
      t &&
      Number.isInteger(t.x) && t.x >= 0 && t.x < 5 &&
      Number.isInteger(t.y) && t.y >= 0 && t.y < 5 &&
      (t.letter === undefined || isLetter(t.letter))
  );

const isCount = (n) => Number.isInteger(n) && n >= 0;

export const saveDailyProgress = (progress) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked. The round still plays; it just won't resume.
  }
};

/**
 * The round in progress for `date`, or null when there is nothing to resume.
 * A save from another day is ignored: that was a different puzzle, and laying
 * its letters over today's would make no sense.
 */
export const readDailyProgress = (date) => {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p || p.date !== date) return null;
    if (!isBoard(p.board) || !isTileList(p.preservedTiles)) return null;
    if (![p.timerSeconds, p.letterHintsUsed, p.timedAutoReveals].every(isCount)) return null;
    if (typeof p.wordHintUsed !== 'boolean') return null;
    return p;
  } catch {
    return null;
  }
};

export const clearDailyProgress = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
};
