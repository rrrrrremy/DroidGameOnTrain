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
- **Payments**: LNURL-pay lightning address fronted by Alby
  (`getalby.com`), funds land on the Alby Hub. The address lives in ONE
  constant: `droid-game/src/utils/lightning.js` → `LIGHTNING_ADDRESS`.
  The app requires the callback to return a LUD-21 `verify` URL and fails
  loudly without it.
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

- App Store guideline 3.1.1: sats-for-games unlocking will likely need
  StoreKit IAP or hiding the paid mode on iOS before submission.
- How to Play claims the full board is shown during Reading Time; the board
  actually shows only the preserved letters. Copy or behaviour needs
  reconciling (owner's call).
