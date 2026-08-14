import React, { useState, useEffect } from 'react';
import {
  submitScore,
  initialsFrom,
  isAllowedInitials,
  fetchLeaderboard,
  getCachedLeaderboard,
  hasSubmittedLeaderboardScore,
  markLeaderboardScoreSubmitted,
} from '../utils/leaderboard';
import { BOARD_SHAPES } from '../utils/computerPlayer';

const Leaderboard = ({ date, shape, score, maxScore, onClose, onHome, canSubmit, onSubmitted }) => {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(() => hasSubmittedLeaderboardScore(date));
  const [submitting, setSubmitting] = useState(false);
  const [ownEntryId, setOwnEntryId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const shapeName = BOARD_SHAPES[shape]?.name || 'Droid';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAllowedInitials(name) || submitting || submitted || hasSubmittedLeaderboardScore(date)) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitScore({ name, score, maxScore, date, shape });
      markLeaderboardScoreSubmitted(date);
      setSubmitted(true);
      onSubmitted?.();
      const optimisticEntry = {
        id: `local-${Date.now()}`,
        name: initialsFrom(name),
        score,
        maxScore,
        percent,
        date,
        shape,
      };
      setOwnEntryId(optimisticEntry.id);
      setEntries((prev) =>
        [...prev, optimisticEntry]
          .sort((a, b) => b.percent - a.percent || b.score - a.score)
          .slice(0, 50)
      );
      loadEntries({ showSpinner: false });
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit. Check Firestore rules.');
    } finally {
      setSubmitting(false);
    }
  };

  const rankedEntries = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
  const topEntries = rankedEntries.slice(0, 5);
  const ownEntry = ownEntryId
    ? rankedEntries.find((entry) => entry.id === ownEntryId)
    : null;
  const visibleEntries = ownEntry && ownEntry.rank > 5
    ? [...topEntries, ownEntry]
    : topEntries;
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
          <form className="leaderboard-form" onSubmit={handleSubmit}>
            <div className="leaderboard-input-row">
              <input
                type="text"
                className="leaderboard-name-input"
                placeholder="AB"
                value={name}
                onChange={(e) => setName(initialsFrom(e.target.value))}
                maxLength={2}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Your initials, two letters"
                autoFocus
              />
              <button
                type="submit"
                className="leaderboard-submit-btn"
                disabled={!isAllowedInitials(name) || submitting}
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
            </div>
            <div className="leaderboard-your-score">
              Your score: <strong>{score}/{maxScore} ({percent}%)</strong>
            </div>
          </form>
        )}

        {submitted && (
          <div className="leaderboard-submitted">Score submitted!</div>
        )}

        {error && <div className="leaderboard-error">{error}</div>}
        {refreshing && entries.length > 0 && (
          <div className="leaderboard-refreshing">Updating scores…</div>
        )}

        <div className="leaderboard-list-wrap">
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
              {visibleEntries.map((entry) => (
                <div key={`${entry.id}-${entry.rank}`} className={`leaderboard-row${entry.id === ownEntryId ? ' is-own-score' : ''}`}>
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

        <button className="back-to-menu-btn" onClick={onHome || onClose}>
          ← Back to Menu
        </button>

      </div>
    </div>
  );
};

export default Leaderboard;
