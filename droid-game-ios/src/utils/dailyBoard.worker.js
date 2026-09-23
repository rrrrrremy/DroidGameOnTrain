/* eslint-disable no-restricted-globals */
/**
 * Builds today's daily board off the main thread. See dailyBoardBuilder.js.
 */
import { generateDailyBoard, dailyShape, todayString } from './computerPlayer';

self.onmessage = () => {
  const shape = dailyShape();
  self.postMessage({ date: todayString(), shape, result: generateDailyBoard(shape) });
};
