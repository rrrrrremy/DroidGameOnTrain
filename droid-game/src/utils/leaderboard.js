import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION = 'daily_scores';

/** Submit a score to the daily leaderboard. */
export const submitScore = async ({ name, score, maxScore, date, shape }) => {
  await addDoc(collection(db, COLLECTION), {
    name: name.trim().slice(0, 20),
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    date,
    shape,
    createdAt: serverTimestamp(),
  });
};

/** Fetch today's leaderboard — filter by date only (no composite index needed),
 *  sort and cap client-side. */
export const fetchLeaderboard = async (date) => {
  const q = query(
    collection(db, COLLECTION),
    where('date', '==', date),
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  entries.sort((a, b) => b.percent - a.percent || b.score - a.score);
  return entries.slice(0, 50);
};
