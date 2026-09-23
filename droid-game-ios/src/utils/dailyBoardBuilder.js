/**
 * Today's daily board, built in the background.
 *
 * Building a board means proving it has exactly one solution against the
 * whole dictionary, which takes anywhere from under a second to fifteen,
 * depending on the day. Run on the main thread, that froze the home screen
 * on the first open of each day: PLAY DROID could not be pressed until it
 * finished. A Web Worker keeps the page responsive while it runs.
 *
 * The board comes from the daily seed, so it is identical wherever it is
 * built. If a worker cannot be started or fails, it is built on the main
 * thread instead, as it always was: slower to respond, but never no board.
 */
import { generateDailyBoard, dailyShape, todayString } from './computerPlayer';

let pending = null;

const buildOnMainThread = (resolve) => {
  window.setTimeout(() => {
    const shape = dailyShape();
    resolve({ date: todayString(), shape, result: generateDailyBoard(shape) });
  }, 0);
};

/** Resolves to `{ date, shape, result }`; `result` is null if no board could be built. */
export const buildDailyBoard = () => {
  if (pending) return pending;

  pending = new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL('./dailyBoard.worker.js', import.meta.url));
    } catch {
      buildOnMainThread(resolve);
      return;
    }
    worker.onmessage = (event) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = () => {
      worker.terminate();
      buildOnMainThread(resolve);
    };
    worker.postMessage(null);
  }).then((built) => {
    // Let a later call (e.g. after midnight) build afresh.
    pending = null;
    return built;
  });

  return pending;
};
