// App-wide configuration for the iOS build.

// Public web deployment of Droid. Share links generated inside the app point
// here so that recipients can play in a browser even without the iOS app
// installed. Change this if the game is hosted somewhere else.
export const SHARE_BASE_URL = 'https://droidgame.web.app';

// Custom URL scheme registered in ios/App/App/Info.plist. Opening
// droid://play?g=<token> hands the shared board straight to the installed app.
export const APP_URL_SCHEME = 'droid';

// Testing only: lifts the one-daily-game limit so a build can be played over
// and over. Deliberately driven by a build-time variable rather than a value
// edited here, so that `npm run build` and `npm run sync` are always
// shippable and only the explicit `npm run sync:testing` disables the limit.
export const UNLIMITED_DAILY_PLAYS =
  process.env.REACT_APP_UNLIMITED_DAILY_PLAYS === '1';
