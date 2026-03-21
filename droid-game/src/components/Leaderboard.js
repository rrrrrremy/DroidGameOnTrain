import React, { useState, useEffect } from 'react';
import { submitScore, fetchLeaderboard } from '../utils/leaderboard';

const Leaderboard = ({ date, shape, score, maxScore, onClose, canSubmit }) => {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const loadEntries = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await fetchLeaderboard(date);
      setEntries(data);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Could not load scores. Check Firestore rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitScore({ name, score, maxScore, date, shape });
      setSubmitted(true);
      await loadEntries();
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit. Check Firestore rules.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="leaderboard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="leaderboard-modal">
        <div className="leaderboard-header">
          <h2>Daily Leaderboard</h2>
          <p className="leaderboard-date">{date}</p>
          <button className="leaderboard-x-btn" onClick={onClose}>✕</button>
        </div>

        {canSubmit && !submitted && (
          <form className="leaderboard-form" onSubmit={handleSubmit}>
            <div className="leaderboard-your-score">
              Your score: <strong>{score}/{maxScore} ({percent}%)</strong>
            </div>
            <div className="leaderboard-input-row">
              <input
                type="text"
                className="leaderboard-name-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <button
                type="submit"
                className="leaderboard-submit-btn"
                disabled={!name.trim() || submitting}
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {submitted && (
          <div className="leaderboard-submitted">Score submitted!</div>
        )}

        {error && <div className="leaderboard-error">{error}</div>}

        <div className="leaderboard-list-wrap">
          {loading ? (
            <div className="leaderboard-loading">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty">No scores yet — be the first!</div>
          ) : (
            <div className="leaderboard-list">
              <div className="leaderboard-row leaderboard-row-header">
                <span className="lb-rank">#</span>
                <span className="lb-name">Name</span>
                <span className="lb-score">Score</span>
                <span className="lb-pct">%</span>
              </div>
              {entries.map((entry, i) => (
                <div key={entry.id} className="leaderboard-row">
                  <span className="lb-rank">{i + 1}</span>
                  <span className="lb-name">{entry.name}</span>
                  <span className="lb-score">{entry.score}/{entry.maxScore}</span>
                  <span className="lb-pct">{entry.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="leaderboard-actions">
          <button className="leaderboard-close-btn" onClick={onClose}>
            {canSubmit ? 'Back to Results' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
