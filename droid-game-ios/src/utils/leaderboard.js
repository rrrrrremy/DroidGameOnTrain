import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION = 'daily_scores';
const CACHE_TTL_MS = 5 * 60 * 1000;
const inFlightRequests = new Map();

const cacheKey = (date) => `droid_leaderboard_${date}`;
const submittedKey = (date) => `droid_leaderboard_submitted_${date}`;

const sortEntries = (entries) =>
  [...entries].sort((a, b) => b.percent - a.percent || b.score - a.score).slice(0, 50);

export const getCachedLeaderboard = (date) => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(date)) || 'null');
    if (!cached || !Array.isArray(cached.entries)) return null;
    if (Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached.entries;
  } catch {
    return null;
  }
};

const setCachedLeaderboard = (date, entries) => {
  try {
    localStorage.setItem(cacheKey(date), JSON.stringify({
      savedAt: Date.now(),
      entries,
    }));
  } catch {
    // Cache is a speed boost only.
  }
};

export const hasSubmittedLeaderboardScore = (date) =>
  localStorage.getItem(submittedKey(date)) === 'true';

export const markLeaderboardScoreSubmitted = (date) => {
  localStorage.setItem(submittedKey(date), 'true');
};

/** Two uppercase letters, the arcade high-score convention.
 *
 * A free-text name field is user-generated content, and App Store guideline
 * 1.2 then requires filtering, reporting and blocking. Two letters is a
 * 676-option pick list wearing a text field's clothing - there is close to
 * nothing objectionable you can spell in it - so the obligation does not
 * arise. Three letters would be a different matter; plenty of slurs are
 * exactly three long.
 */
export const initialsFrom = (value) =>
  String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);

// "Close to nothing" is not nothing. These carry extremist meaning and cost
// nothing to refuse.
const BLOCKED_INITIALS = new Set(['SS', 'HH', 'WP', 'KK', 'NS', 'AH', 'CP']);

export const isAllowedInitials = (value) => {
  const initials = initialsFrom(value);
  return initials.length === 2 && !BLOCKED_INITIALS.has(initials);
};

/** Submit a score to the daily leaderboard. */
export const submitScore = async ({ name, score, maxScore, date, shape }) => {
  if (!isAllowedInitials(name)) throw new Error('Initials must be two letters.');
  await addDoc(collection(db, COLLECTION), {
    name: initialsFrom(name),
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    date,
    shape,
    createdAt: serverTimestamp(),
  });
};

/** Fetch today's leaderboard from Firestore. Prefer an indexed top-50 query;
 * fall back to the original date-only query if the composite index is missing. */
const fetchLeaderboardRemote = async (date) => {
  const collectionRef = collection(db, COLLECTION);

  try {
    const fastQuery = query(
      collectionRef,
      where('date', '==', date),
      orderBy('percent', 'desc'),
      orderBy('score', 'desc'),
      limit(50)
    );
    const snap = await getDocs(fastQuery);
    const entries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const sorted = sortEntries(entries);
    setCachedLeaderboard(date, sorted);
    return sorted;
  } catch (error) {
    console.warn('Fast leaderboard query failed; falling back to date-only query.', error);
  }

  // Capped both for cost and because the security rules refuse list
  // queries without a limit. 200 covers any plausible day of real scores.
  const fallbackQuery = query(collectionRef, where('date', '==', date), limit(200));
  const snap = await getDocs(fallbackQuery);
  const entries = sortEntries(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  setCachedLeaderboard(date, entries);
  return entries;
};

export const fetchLeaderboard = (date) => {
  if (inFlightRequests.has(date)) return inFlightRequests.get(date);

  const request = fetchLeaderboardRemote(date).finally(() => {
    inFlightRequests.delete(date);
  });
  inFlightRequests.set(date, request);
  return request;
};

export const preloadLeaderboard = (date) => {
  if (getCachedLeaderboard(date)) return Promise.resolve();
  return fetchLeaderboard(date).catch(() => {
    // Preloading should never surface errors to the game UI.
  });
};
