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

## Known open items

- Force-quitting the app mid-round still keeps the daily: it is only spent
  when a round ends or is deliberately forfeited. Closing that means
  marking the day as played the moment a round starts, which would cost a
  player their day on a crash (owner's call).
