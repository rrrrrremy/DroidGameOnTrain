# DroidGameOnTrain

Word-reconstruction game ("Droid") by Second Nature Games (Remy & Matthew
Browne). Two codebases, one game:

- `droid-game/` — the web app (Create React App). **Source of truth for all
  game code.** Deployed to Firebase Hosting (`droidgame.web.app`).
- `droid-game-ios/` — Capacitor iOS wrapper. `src/` and `public/` are
  **generated** from `droid-game` by `droid-game-ios/tools/sync-from-web.py`,
  which re-applies a small set of asserted iOS patches. Never hand-edit the
  synced files there; change `droid-game` and re-run the script.

## Working agreements

- All work happens on the `preserve-current-localhost` branch. Do not create
  or push other branches.
- Game changes go in `droid-game`, then:
  `cd droid-game-ios && python3 tools/sync-from-web.py && npm run sync`
  (`npm run sync:testing` builds with the one-game-a-day limit disabled, for
  device testing only).
- Verify UI work with Playwright against the production build at iPhone
  sizes; `env(safe-area-inset-*)` is 0 in desktop browsers, so safe-area
  regressions only show on real hardware.

## Infrastructure

- **Node**: Start9 (StartOS 0.4) box, always on. Runs Bitcoin and
  **Alby Hub** (embedded LDK node — the box's separate LND is unused).
- **Payments**: removed from the game. The paid "play more today" mode was
  hidden on iOS for App Store guideline 3.1.1, then taken out of the web
  build too, so nothing in either build reaches a payment. `PaymentModal.js`
  and `utils/lightning.js` are left in place, unreferenced and therefore not
  bundled, so the LNURL-pay work is recoverable: the address is one constant
  (`LIGHTNING_ADDRESS`), fronted by Alby, settling to the Alby Hub, and the
  flow requires a LUD-21 `verify` URL.
- **Leaderboard**: Firestore (project `onebitcoin-38ea0`), rules in
  `firestore.rules`.

## Releasing to the App Store

- Both version numbers live in `droid-game-ios/ios/App/App.xcodeproj/project.pbxproj`
  and are tracked in git. Do not let Xcode manage them during Distribute:
  it increments the build number without writing it back, so the repo and
  App Store Connect drift apart.
- `MARKETING_VERSION` must go **up for every release**. Once a version is
  approved, that train closes and App Store Connect refuses any further
  build under it (errors 90062 and 90186), whatever the build number is.
- `CURRENT_PROJECT_VERSION` must be unique within a train. Incrementing it
  every upload, across trains, is the simplest way to never collide.
- A new marketing version also needs a matching version created in App
  Store Connect before a build can be submitted against it.

## Daily board build

- The daily board is built from the date seed and must have exactly one
  solution, which the solution counter in `utils/computerPlayer.js` proves.
  It runs in a Web Worker (`utils/dailyBoardBuilder.js`), falling back to
  the main thread if a worker fails, and is cached in local storage for the
  day. On the main thread it froze the home screen for up to ~15 s on the
  first open of the day.
- Any change to the generators or the counter must leave every daily board
  identical (players on web and iOS must get the same puzzle). Compare a
  couple of months of `generateDailyBoard` output against the previous
  version before shipping.

## Known open items

- The daily round is saved as it is played (`utils/dailyProgress.js`), so
  closing the app mid-round resumes it - same board, placements, hints and
  clock - instead of starting it again. What stays open: the clock is
  paused while the app is backgrounded or closed (a deliberate fix for
  rounds scored as if the phone had been left running), so a player can
  still think away from the clock. Counting time away would close that and
  reopen the original complaint (owner's call).
- All daily limits live in local storage with no accounts, so deleting and
  reinstalling the app, or clearing site data on the web, resets them.
  Closing that needs a server-side record per player.
