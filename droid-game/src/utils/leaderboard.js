import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
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

/** Fetch today's leaderboard (top 50, sorted by percent desc). */
export const fetchLeaderboard = async (date) => {
  const q = query(
    collection(db, COLLECTION),
    where('date', '==', date),
    orderBy('percent', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
