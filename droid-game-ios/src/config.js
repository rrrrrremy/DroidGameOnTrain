// App-wide configuration for the iOS build.

// Public web deployment of Droid. Share links generated inside the app point
// here so that recipients can play in a browser even without the iOS app
// installed. Change this if the game is hosted somewhere else.
export const SHARE_BASE_URL = 'https://droidgame.web.app';

// Custom URL scheme registered in ios/App/App/Info.plist. Opening
// droid://play?g=<token> hands the shared board straight to the installed app.
export const APP_URL_SCHEME = 'droid';
