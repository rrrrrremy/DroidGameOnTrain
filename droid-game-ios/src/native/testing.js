// Testing-only overrides, applied before React mounts.
//
// This lives in an iOS-only file rather than being patched into the game by
// tools/sync-from-web.py on purpose: the sync script's patches are a
// maintenance burden and a breakage point every time the game changes, and a
// testing convenience does not deserve either. Nothing here runs unless the
// build was made with `npm run sync:testing`.

import { UNLIMITED_DAILY_PLAYS } from '../config';

// The daily limit is enforced entirely through localStorage: one key marking
// today as played, and one per date marking the leaderboard score submitted.
const DAILY_LIMIT_KEYS = [
  /^droid_daily_played$/,
  /^droid_leaderboard_submitted_/,
];

/** Lift the one-game-a-day limit: forget it was played and stop recording it. */
const disableDailyLimit = () => {
  const isLimitKey = (key) => DAILY_LIMIT_KEYS.some((re) => re.test(key));

  Object.keys(localStorage)
    .filter(isLimitKey)
    .forEach((key) => localStorage.removeItem(key));

  // Clearing at startup alone would only buy one game per launch, since
  // finishing a game writes the key straight back. Drop those writes instead.
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (isLimitKey(key)) return;
    return setItem.call(this, key, value);
  };

  console.warn(
    'TESTING BUILD: the one-game-a-day limit is disabled. ' +
    'Rebuild with `npm run sync` for a shippable app.'
  );
};

export const applyTestingOverrides = () => {
  if (UNLIMITED_DAILY_PLAYS) disableDailyLimit();
};
