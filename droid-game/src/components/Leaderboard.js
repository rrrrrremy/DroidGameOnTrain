import React, { useState, useEffect, useRef } from 'react';
import {
  fetchLeaderboard,
  getCachedLeaderboard,
  hasSubmittedLeaderboardScore,
} from '../utils/leaderboard';
import ScoreSubmitForm from './ScoreSubmitForm';
import { BOARD_SHAPES } from '../utils/computerPlayer';

const Leaderboard = ({
  date, shape, score, maxScore, onClose, onHome, canSubmit, onSubmitted,
  // Where the bottom button goes. It is the menu when the player opened the
  // board themselves, and back to the results screen when the board opened
  // itself over one - otherwise finishing a round and dismissing the board
  // would skip past the answer without ever showing it.
  onBack, backLabel = '← Back to Menu',
}) => {
  const [submitted, setSubmitted] = useState(() => hasSubmittedLeaderboardScore(date));
  const [ownEntryId, setOwnEntryId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const shapeName = BOARD_SHAPES[shape]?.name || 'Droid';

  const ownRowRef = useRef(null);

  // A player posting into a busy day can land far below the fold, so bring
  // their row to them rather than leaving them to hunt for it.
  useEffect(() => {
    if (!ownEntryId || !ownRowRef.current) return;
    ownRowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [ownEntryId, entries]);

  const loadEntries = async ({ showSpinner = true } = {}) => {
    setError(null);
    try {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      const data = await fetchLeaderboard(date);
      setEntries(data);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(entries.length > 0 ? 'Could not refresh scores.' : 'Could not load scores. Check Firestore rules.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setSubmitted(hasSubmittedLeaderboardScore(date));
    setOwnEntryId(null);
    const cached = getCachedLeaderboard(date);
    if (cached) {
      setEntries(cached);
      setLoading(false);
      loadEntries({ showSpinner: false });
    } else {
      loadEntries();
    }
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Show the new score immediately, then reconcile with the server. */
  const handleSubmitted = (optimisticEntry) => {
    setSubmitted(true);
    onSubmitted?.();
    setOwnEntryId(optimisticEntry.id);
    setEntries((prev) =>
      [...prev, optimisticEntry]
        .sort((a, b) => b.percent - a.percent || b.score - a.score)
        .slice(0, 50)
    );
    loadEntries({ showSpinner: false });
  };

  const rankedEntries = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
  const averagePercent = entries.length > 0
    ? Math.round(entries.reduce((sum, entry) => sum + (entry.percent || 0), 0) / entries.length)
    : null;

  return (
    <div className="leaderboard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`leaderboard-modal${canSubmit && !submitted ? ' has-entry-form' : ''}`}>
        <div className="leaderboard-topbar">
          <button className="dvh-home-button leaderboard-home-button" onClick={onHome || onClose} aria-label="Back to home screen">
            D
          </button>
          <div className="leaderboard-title-card">
            <span>DROID v HUMAN</span>
            <small>{shapeName} | {date}</small>
            <strong>Leaderboard</strong>
          </div>
        </div>

        {canSubmit && !submitted && (
          <ScoreSubmitForm
            date={date}
            shape={shape}
            score={score}
            maxScore={maxScore}
            autoFocus
            onSubmitted={handleSubmitted}
          />
        )}

        {submitted && (
          <div className="leaderboard-submitted">Score submitted!</div>
        )}

        {error && <div className="leaderboard-error">{error}</div>}
        {refreshing && entries.length > 0 && (
          <div className="leaderboard-refreshing">Updating scores…</div>
        )}

        <div className={`leaderboard-list-wrap${loading || entries.length === 0 ? ' is-message' : ''}`}>
          {loading ? (
            <div className="leaderboard-loading">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty">No scores yet. Be the first!</div>
          ) : (
            <div className="leaderboard-list">
              <div className="leaderboard-row leaderboard-row-header">
                <span className="lb-rank">#</span>
                <span className="lb-name">Name</span>
                <span className="lb-score">Score</span>
                <span className="lb-pct">%</span>
              </div>
              {rankedEntries.map((entry) => (
                <div
                  key={`${entry.id}-${entry.rank}`}
                  ref={entry.id === ownEntryId ? ownRowRef : null}
                  className={`leaderboard-row${entry.id === ownEntryId ? ' is-own-score' : ''}`}
                >
                  <span className="lb-rank">{entry.rank}</span>
                  <span className="lb-name">{entry.name}</span>
                  <span className="lb-score">{entry.score}/{entry.maxScore}</span>
                  <span className="lb-pct">{entry.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="leaderboard-average-card">
          {averagePercent === null ? 'Average of scores played to date' : `Average score to date: ${averagePercent}%`}
        </div>

        <button className="back-to-menu-btn" onClick={onBack || onHome || onClose}>
          {backLabel}
        </button>

      </div>
    </div>
  );
};

export default Leaderboard;
