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

## Pulling in changes from the web game

`src/` here is a generated copy of `../droid-game/src`. When the web game moves
forward, bring the app up to date with:

```bash
python3 tools/sync-from-web.py     # re-copy the game + re-apply the iOS changes
npm install                        # only if the script reports new dependencies
npm run sync                       # rebuild and push into the Xcode project
```

`sync-from-web.py` re-copies the web sources, re-applies the handful of iOS
adaptations listed below, and adopts any dependency the game has gained (the
two `package.json` files are separate because this one adds the Capacitor
plugins). Each adaptation is asserted: if the game's source moves out from
under a patch, the script stops and names it rather than quietly producing an
app with, say, no working tile placement. When that happens, open the script,
update that patch to match the new code, and re-run.

Do not hand-edit `src/` here — the next sync overwrites it. Changes belong in
`../droid-game`, or, if they are genuinely iOS-only, in the files listed under
`IOS_ONLY` at the top of the sync script.

For fast iteration you can also just run `npm start` and develop in a desktop
browser; everything except the native plugins behaves identically.

## What differs from the web version

The game logic, scoring, computer player, and Firebase leaderboard are
untouched. These changes exist specifically because it runs as an app:

- **Tap to move tiles.** HTML5 drag-and-drop does not fire in `WKWebView`, so
  tapping a filled tile picks the letter up into your hand and tapping an empty
  tile drops it — a two-tap move. The `×` badge still clears a tile outright.
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
src/                    copied from ../droid-game/src by the sync script
  config.js             iOS-only: share URL + URL scheme
  native/ios.js         iOS-only: Capacitor wrappers, no-ops in a browser
  styles/ios.css        iOS-only: overrides loaded after main.css
  index.js              iOS-only: entry point, loads ios.css
public/index.html       iOS-only: viewport, bundled font, icons
public/fonts/           iOS-only: bundled Press Start 2P
ios/                    generated Xcode project — open App.xcworkspace
tools/sync-from-web.py  re-copy the game and re-apply the iOS changes
tools/make-icons.py     regenerate the app icon and splash
capacitor.config.json
```

## Icons

`tools/make-icons.py` builds the app icon and launch splash from
`public/favicon.svg`, the same droid mark the web app uses. It needs cairosvg
and Pillow:

```bash
pip install cairosvg pillow
python3 tools/make-icons.py && npx cap sync ios
```

The icon is a full-bleed version of the mark — the logo's own rounded frame is
dropped, because iOS applies its own squircle mask and a second frame inside it
reads as a badge within a badge. That layout lives in `ICON_SVG` in the script;
if the logo changes, mirror the change there.

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
- **The Lightning pay-per-game will most likely be rejected as it stands.**
  App Store guideline 3.1.1 requires that anything unlocking features or
  content inside the app is sold through In-App Purchase; paying 100 sats via
  Alby to unlock custom shapes is exactly the case it covers, and "it's
  Bitcoin" is not an exemption. The flow itself works fine technically — Alby
  is reached over HTTPS and Capacitor hands the `lightning:` link to a wallet
  app — so this is purely a policy problem. The realistic options are to add a
  StoreKit purchase for the iOS build, or to hide the paid shapes on iOS and
  keep them a web-only feature. Worth resolving before you spend time on
  submission.
