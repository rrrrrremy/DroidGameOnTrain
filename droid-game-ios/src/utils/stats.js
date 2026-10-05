/**
 * Daily results, kept on this device, and the streak and stats built from
 * them. There are no accounts: like the one-game-a-day limit, this lives in
 * local storage, so deleting the app (or clearing site data) starts it over.
 *
 * One record per daily puzzle, keyed by the puzzle's date (YYYY-MM-DD,
 * local time, the same key the daily seed uses):
 *   { score, maxScore, seconds, hints, wordHint, solved }  a finished round
 *   { forfeit: true }                                      a forfeited one
 *
 * Streak rule: any finished daily counts, solved or not, so a hard puzzle
 * never costs a streak. A forfeit or a missed day ends it. A streak still
 * counts while today is unplayed, as long as yesterday was played.
 */
const KEY = 'droid_daily_history';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isNumber = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

const isRecord = (r) =>
  !!r && typeof r === 'object' && (
    r.forfeit === true ||
    (isNumber(r.score) && isNumber(r.maxScore) && r.maxScore > 0 &&
      isNumber(r.seconds) && isNumber(r.hints) && typeof r.solved === 'boolean')
  );

/** Every valid record, by date. Anything malformed is dropped, not trusted. */
export const readHistory = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const history = {};
    Object.entries(raw).forEach(([date, record]) => {
      if (DATE_RE.test(date) && isRecord(record)) history[date] = record;
    });
    return history;
  } catch {
    return {};
  }
};

/**
 * Save the result of the daily for `date` and return the updated history.
 * The first record for a day stands: a round is only ever played once, and
 * re-rendering the result screen must not rewrite it.
 */
export const recordDailyResult = (date, record) => {
  const history = readHistory();
  if (!DATE_RE.test(date) || history[date] || !isRecord(record)) return history;
  history[date] = record;
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Storage full or blocked: the stats just won't include this round.
  }
  return history;
};

/** The YYYY-MM-DD key one calendar day before `key`. Noon avoids DST edges. */
export const previousDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const counts = (record) => !!record && !record.forfeit;

/**
 * Streak and stats as of `today` (YYYY-MM-DD):
 *   currentStreak  consecutive finished days ending today, or yesterday if
 *                  today is not played yet
 *   bestStreak     the longest such run ever
 *   played         finished dailies (forfeits excluded)
 *   solved         of those, solved
 *   averageScore   mean score of finished dailies, or null with none
 *   bestTime       fastest solve in seconds, or null with none
 *   playedToday    whether today has a record (finished or forfeited)
 */
export const computeStats = (history, today) => {
  const dates = Object.keys(history).sort();
  const finished = dates.filter((d) => counts(history[d]));

  let bestStreak = 0;
  let run = 0;
  let prev = null;
  finished.forEach((d) => {
    run = prev && previousDay(d) === prev ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  });

  let currentStreak = 0;
  let day = counts(history[today]) ? today : previousDay(today);
  if (history[today] && history[today].forfeit) day = null;
  while (day && counts(history[day])) {
    currentStreak += 1;
    day = previousDay(day);
  }

  const scores = finished.map((d) => history[d].score);
  const solvedTimes = finished.filter((d) => history[d].solved).map((d) => history[d].seconds);

  return {
    currentStreak,
    bestStreak,
    played: finished.length,
    solved: solvedTimes.length,
    averageScore: scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null,
    bestTime: solvedTimes.length ? Math.min(...solvedTimes) : null,
    playedToday: !!history[today],
  };
};
