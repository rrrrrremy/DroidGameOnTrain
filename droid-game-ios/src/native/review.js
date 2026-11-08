// Asking for an App Store rating, iOS only. Same interface as
// src/utils/review.js (the web version, which does nothing); the sync script
// points the game at this file instead.
//
// Apple's own prompt (SKStoreReviewController) decides whether it actually
// appears and caps it at three times a year. On top of that the game only
// asks after a SOLVED daily, from the player's third finished daily on (the
// first one already asks for notification permission), and at most once per
// app version.

import { InAppReview } from '@capacitor-community/in-app-review';
import { App } from '@capacitor/app';
import { isNative } from './ios';

const ASKED_KEY = 'droid_review_asked_version';
const MIN_DAILIES = 3;
const DELAY_MS = 1500; // let the result screen land first

export const maybeAskForReview = async ({ solved, played }) => {
  if (!isNative() || !solved || played < MIN_DAILIES) return false;
  let version;
  try {
    ({ version } = await App.getInfo());
  } catch {
    return false;
  }
  try {
    if (localStorage.getItem(ASKED_KEY) === version) return false;
    localStorage.setItem(ASKED_KEY, version);
  } catch {
    return false; // no storage: never risk asking on every round
  }
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  try {
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
};
