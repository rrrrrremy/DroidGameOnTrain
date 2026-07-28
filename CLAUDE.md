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

## Known open items

- App Store guideline 3.1.1: sats-for-games unlocking will likely need
  StoreKit IAP or hiding the paid mode on iOS before submission.
- How to Play claims the full board is shown during Reading Time; the board
  actually shows only the preserved letters. Copy or behaviour needs
  reconciling (owner's call).
