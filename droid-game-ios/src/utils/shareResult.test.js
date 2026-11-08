import { buildDailyShareText, shareGrid } from './shareResult';

const removed = new Set([1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25]);
const active = [];
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 5; x++) {
    if (!removed.has(y * 5 + x + 1)) active.push({ x, y });
  }
}

test('a solved board is all green except the hint tiles, with gaps dark', () => {
  const preservedTiles = [{ x: 2, y: 0 }, { x: 2, y: 2 }];
  const grid = shareGrid({ removed, preservedTiles, correctTiles: active });
  expect(grid.split('\n')).toEqual([
    '⬛⬛🟨⬛⬛',
    '🟩🟩🟩🟩🟩',
    '⬛🟩🟨🟩⬛',
    '⬛🟩🟩🟩⬛',
    '⬛🟩⬛🟩⬛',
  ]);
});

test('wrong tiles show white and no letters ever appear', () => {
  const correct = active.filter((t) => !(t.x === 0 && t.y === 1));
  const text = buildDailyShareText({
    dateLabel: 'Sun 8 Nov',
    shapeName: 'Skipping',
    removed,
    preservedTiles: [],
    correctTiles: correct,
    solved: false,
    scoreLabel: '3.2/6',
    time: '6:00',
    hints: 1,
    streak: 1,
  });
  const lines = text.split('\n');
  expect(lines[0]).toBe('Droid · Sun 8 Nov · Skipping');
  expect(lines[2]).toBe('⬜🟩🟩🟩🟩');
  expect(lines[6]).toBe('Not solved · 3.2/6 · 1 hint');
  expect(lines[7]).toBe('https://droidgame.web.app');
});

test('a solved round shows its time and a streak above one', () => {
  const text = buildDailyShareText({
    dateLabel: 'Sun 8 Nov',
    shapeName: 'Skipping',
    removed,
    preservedTiles: [],
    correctTiles: active,
    solved: true,
    scoreLabel: '4.9/6',
    time: '3:42',
    streak: 5,
  });
  expect(text.split('\n')[6]).toBe('Solved in 3:42 · 4.9/6 · 🔥5');
});
