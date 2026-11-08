/**
 * The text a player shares after the daily: a spoiler-free picture of the
 * board (tile colours, never letters), the score and a link, so a group chat
 * sees how they did without learning anything about today's grid.
 */

export const SHARE_SITE_URL = 'https://droidgame.web.app';

const TILE = {
  gap: '⬛',
  hint: '🟨',
  correct: '🟩',
  wrong: '⬜',
};

const at = (tiles, x, y) => (tiles || []).some((t) => t.x === x && t.y === y);

/**
 * One line of five emoji per board row. `removed` is the shape's set of
 * square numbers (1-25) that are not part of the board.
 */
export const shareGrid = ({ removed, preservedTiles, correctTiles }) => {
  const rows = [];
  for (let y = 0; y < 5; y++) {
    let row = '';
    for (let x = 0; x < 5; x++) {
      const square = y * 5 + x + 1;
      if (removed && removed.has(square)) row += TILE.gap;
      else if (at(preservedTiles, x, y)) row += TILE.hint;
      else if (at(correctTiles, x, y)) row += TILE.correct;
      else row += TILE.wrong;
    }
    rows.push(row);
  }
  return rows.join('\n');
};

/**
 * The whole message. `scoreLabel` is the score as the result screen shows it
 * (e.g. "4.9/6"), `time` is "m:ss" or null when the round was untimed.
 */
export const buildDailyShareText = ({
  dateLabel,
  shapeName,
  removed,
  preservedTiles,
  correctTiles,
  solved,
  scoreLabel,
  time,
  hints = 0,
  streak = 0,
  url = SHARE_SITE_URL,
}) => {
  const summary = [
    solved ? `Solved${time ? ` in ${time}` : ''}` : 'Not solved',
    scoreLabel,
    hints > 0 ? `${hints} hint${hints === 1 ? '' : 's'}` : null,
    streak > 1 ? `🔥${streak}` : null,
  ].filter(Boolean).join(' · ');

  return [
    `Droid · ${dateLabel} · ${shapeName}`,
    shareGrid({ removed, preservedTiles, correctTiles }),
    summary,
    url,
  ].join('\n');
};
