import React, { useState } from 'react';
import {
  submitScore,
  initialsFrom,
  isAllowedInitials,
  hasSubmittedLeaderboardScore,
  markLeaderboardScoreSubmitted,
} from '../utils/leaderboard';

/**
 * Two initials and a Submit button — the only route a score takes to the
 * leaderboard.
 *
 * It lives in one component because two screens offer it: the results screen
 * prompts for it as soon as a daily round ends, and the leaderboard overlay
 * still offers it for anyone who skipped the prompt. A pair of separately
 * maintained forms both writing to the same collection is exactly the kind
 * of thing that quietly drifts apart.
 */
const ScoreSubmitForm = ({
  date,
  shape,
  score,
  maxScore,
  autoFocus = false,
  submitLabel = 'Submit',
  onSubmitted,
}) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // hasSubmittedLeaderboardScore is checked again here rather than trusted
    // from a prop: the other copy of this form may have posted already.
    if (!isAllowedInitials(name) || submitting || hasSubmittedLeaderboardScore(date)) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitScore({ name, score, maxScore, date, shape });
      markLeaderboardScoreSubmitted(date);
      onSubmitted?.({
        id: `local-${Date.now()}`,
        name: initialsFrom(name),
        score,
        maxScore,
        percent,
        date,
        shape,
      });
    } catch (err) {
      console.error('Submit error:', err);
      setError('Could not post your score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          autoFocus={autoFocus}
        />
        <button
          type="submit"
          className="leaderboard-submit-btn"
          disabled={!isAllowedInitials(name) || submitting}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
      <div className="leaderboard-your-score">
        Your score: <strong>{score}/{maxScore} ({percent}%)</strong>
      </div>
      {error && <div className="leaderboard-form-error">{error}</div>}
    </form>
  );
};

export default ScoreSubmitForm;
