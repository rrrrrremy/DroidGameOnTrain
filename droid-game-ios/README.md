# Droid — iOS

The Droid word game packaged as a native iOS app. All the game logic is the
same React code as the web version in `../droid-game`; [Capacitor](https://capacitorjs.com)
wraps it in a real Xcode project so it ships through the App Store.

## Opening it in Xcode

You need a Mac with Xcode, [Node.js](https://nodejs.org), and
[CocoaPods](https://cocoapods.org) (`sudo gem install cocoapods`).

```bash
cd droid-game-ios
npm install                 # JS dependencies
npm run build               # compile React into build/
npx cap sync ios            # copy build/ into the Xcode project + install pods
npx cap open ios            # opens ios/App/App.xcworkspace in Xcode
```

`npm run ios` does all four steps in one go.

Open **`ios/App/App.xcworkspace`** — not `App.xcodeproj`. The workspace is the
one that includes the CocoaPods dependencies.

In Xcode, select the `App` target → *Signing & Capabilities* → pick your Apple
Developer team. Xcode will assign a provisioning profile automatically. Then
choose a simulator or a connected iPhone and press ▶.

## Making changes

The web code under `src/` is the app. After editing it:

```bash
npm run sync     # rebuild + copy into the iOS project
```

then re-run from Xcode. There is no need to touch the `ios/` folder by hand —
it is regenerated from `capacitor.config.json` and `package.json`.

For fast iteration you can also just run `npm start` and develop in a desktop
browser; everything except the native plugins behaves identically.

## What differs from the web version

The game logic, scoring, computer player, and Firebase leaderboard are
untouched. These changes exist specifically because it runs as an app:

- **Tap to move tiles.** HTML5 drag-and-drop does not fire in `WKWebView`, so
  tapping a filled tile picks the letter up into your hand and tapping an empty
  tile drops it — a two-tap move. The `×` badge still clears a tile outright,
  and it is now always visible (it used to appear only on mouse hover, which
  never happens on a touch screen).
- **Share links point at the web build.** Inside the app `window.location` is
  `capacitor://localhost`, which is meaningless to whoever receives the link.
  Links use `SHARE_BASE_URL` from `src/config.js` instead — change that constant
  if the game is hosted somewhere other than `https://droidgame.web.app`.
- **Incoming shared boards.** The app registers the `droid://` URL scheme, so
  `droid://play?g=<token>` opens a shared board directly, whether the app is
  cold or already running. The web `?g=` path still works unchanged.
- **Native clipboard and haptics** on copy, tile placement, and turn results.
- **Bundled font.** *Press Start 2P* is served from `public/fonts/` rather than
  Google Fonts, so the app looks right with no network connection.
- **Portrait only**, safe-area insets around the notch and home indicator, and
  no rubber-band scrolling, text selection, or double-tap zoom. See
  `src/styles/ios.css` — `main.css` is a byte-for-byte copy of the web version.

## Layout

```
src/                 React app (same as the web version)
  config.js          share URL + URL scheme
  native/ios.js      Capacitor plugin wrappers, no-ops in a browser
  styles/ios.css     iOS-only overrides, loaded after main.css
ios/                 generated Xcode project — open App.xcworkspace
tools/make-icons.py  regenerates the app icon, splash, and favicons
capacitor.config.json
```

## Icons

`tools/make-icons.py` draws the app icon and splash from the game's own droid
board shape, so they stay in sync with the brand colours. It needs Pillow
(`pip install pillow`):

```bash
python3 tools/make-icons.py && npx cap sync ios
```

## Before submitting to the App Store

- Change `appId` in `capacitor.config.json` from `com.droidgame.app` to a
  bundle ID registered to your developer account, then re-run `npx cap sync ios`.
- Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in Xcode for each build.
- The Firebase config in `src/firebase.js` is a client-side key, which is
  normal and safe to ship — access is controlled by `firestore.rules` in the
  repository root, not by hiding the key.
- The leaderboard lets players enter a display name. If you keep it, the App
  Store review form will ask about user-generated content, so be ready to
  describe how names are moderated.
