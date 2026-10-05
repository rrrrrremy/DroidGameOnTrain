# DroidGameOnTrain

Word-reconstruction game ("Droid") by Second Nature Games (Remy & Matthew
Browne). Two codebases, one game:

- `droid-game/` - the web app (Create React App). **Source of truth for all
  game code.** Deployed to Firebase Hosting (`droidgame.web.app`).
- `droid-game-ios/` - Capacitor iOS wrapper, live on the App Store. `src/`
  and `public/` are **generated** from `droid-game` by
  `droid-game-ios/tools/sync-from-web.py`, which re-applies a small set of
  asserted iOS patches. Never hand-edit the synced files there; change
  `droid-game` and re-run the script.

## Branches and GitHub

- **All work happens on `preserve-current-localhost`.** Commit and push
  there only. Do not create other branches.
- **`main` is a mirror** of `preserve-current-localhost`, kept there so the
  GitHub front page shows what is live. `./ship.sh` fast-forwards it after
  every ship. Never commit to `main` directly.
- Never `git reset`, `git pull --rebase`, force-push, or rewrite history.
  The branch is the record of the live game.
- **Cloud sessions (Claude Code on the web) can start on a stale branch or
  an old checkout.** Before any edit, check `git status -sb`; if it is not
  `preserve-current-localhost`, run
  `git fetch origin preserve-current-localhost && git checkout preserve-current-localhost`
  (a tracking branch; nothing local is at risk on a fresh checkout).
- Cloud sessions can push commits but cannot delete branches or change
  repository settings; do those on github.com.
- The repository (`rrrrrremy/DroidGameOnTrain`) is meant to be private.

## Making a change

1. Change game code in `droid-game/src`.
2. Test the web app: `cd droid-game && npm run test:ci`.
3. Regenerate the iOS sources: `cd droid-game-ios && python3 tools/sync-from-web.py`
   (it must report all its adaptations applied; a failure names the patch
   whose anchor moved), then test them:
   `CI=true npx react-scripts test --watchAll=false`.
4. Verify UI work with Playwright against the production build at iPhone
   sizes (390x844 and the SE's 375x667 at least). `env(safe-area-inset-*)`
   is 0 in desktop browsers, so safe-area regressions only show on real
   hardware.
5. Commit both `droid-game` and the regenerated `droid-game-ios` together.

iOS-only code lives in `droid-game-ios/src/native/`, `src/config.js`,
`src/styles/ios.css`, `src/index.js` and `public/index.html`, which the
sync never overwrites. When a feature needs native behaviour, give the web
app a do-nothing module with the same interface and have the sync repoint
the import (see `utils/reminders.js` and `native/reminders.js`).

For device or simulator testing use `./ship.sh test` (see Shipping), not
`npm run sync:testing` directly: the script also installs dependencies.

## Shipping

- **`./ship.sh` is the one command**, run from the repo root on a clean
  `preserve-current-localhost`. Every mode pulls first and runs
  `npm install`, so a new plugin can't fail with "Module not found".
  - `./ship.sh` - release both: deploys the website (`npm run deploy` in
    `droid-game`: tests, `npm audit`, build, Firebase Hosting and Firestore
    indexes), builds the iOS app (sync, `cap sync`), opens Xcode, then
    fast-forwards `main`.
  - `./ship.sh web` / `./ship.sh ios` - one side only.
  - `./ship.sh test` - iOS testing build (one-game-a-day limit off, "TEST
    BUILD" badge) for the simulator or a cabled phone. Never archived;
    leaves `main` alone.
  - `./deploy.sh` is kept as a shortcut for `./ship.sh web`.
  - Every run ends with a report of warnings and errors (finished or
    failed), copied to the clipboard on a Mac and kept in
    `.ship-logs/latest-report.txt`, with the full log beside it
    (git-ignored). The owner pastes it back to Claude; read it before
    anything else when a ship goes wrong.
- Then archive in Xcode (`droid-game-ios/ios/App/App.xcworkspace`) and
  upload. After adding a native plugin, use Product > Clean Build Folder
  if Xcode reports a missing module.
- Do not run `firebase deploy` from the repo root: the root
  `firebase.json` and `public/` are an old placeholder site. Hosting config
  lives in `droid-game/firebase.json`. `netlify.toml` is from an earlier
  Netlify setup and is not part of shipping.
- The web deploy refuses to run while `npm audit --omit=dev` reports
  anything. Never `npm audit fix --force`: it "fixes" by downgrading
  Firebase to 2022. `@grpc/grpc-js` is pinned to a patched release with
  `overrides` in both `package.json` files, because even current
  Firestore pins `~1.9` (it is server-side only and not in the app bundle).
  Drop the override once Firestore depends on a fixed version.
  `react-scripts` is a devDependency in both projects, so the audit covers
  only what ships.
- `index.html` is served `no-cache` and `/static/**` as immutable, so a
  deploy is live on the next load. If the site looks stale, check the
  response headers before suspecting the deploy.

## Releasing to the App Store

- Both version numbers live in `droid-game-ios/ios/App/App.xcodeproj/project.pbxproj`
  and are tracked in git. Do not let Xcode manage them during Distribute
  (leave "Manage version and build number" unticked): it increments the
  build number without writing it back, so the repo and App Store Connect
  drift apart.
- `MARKETING_VERSION` must go **up for every release**. Once a version is
  approved, that train closes and App Store Connect refuses any further
  build under it (errors 90062 and 90186), whatever the build number is.
- `CURRENT_PROJECT_VERSION` must be unique within a train. Incrementing it
  every upload, across trains, is the simplest way to never collide.
- A new marketing version also needs a matching version created in App
  Store Connect before a build can be submitted against it.

## Infrastructure

- **Node**: Start9 (StartOS 0.4) box, always on. Runs Bitcoin and
  **Alby Hub** (embedded LDK node - the box's separate LND is unused).
- **Payments**: removed from the game. The paid "play more today" mode was
  hidden on iOS for App Store guideline 3.1.1, then taken out of the web
  build too, so nothing in either build reaches a payment. `PaymentModal.js`
  and `utils/lightning.js` are left in place, unreferenced and therefore not
  bundled, so the LNURL-pay work is recoverable: the address is one constant
  (`LIGHTNING_ADDRESS`), fronted by Alby, settling to the Alby Hub, and the
  flow requires a LUD-21 `verify` URL.
- **Leaderboard**: Firestore (project `onebitcoin-38ea0`), rules in
  `firestore.rules`.

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

## Streak, stats and reminders

- Each daily result (or forfeit) is saved on the device in
  `utils/stats.js` (`droid_daily_history`), which also computes the
  streak and stats shown on the home card and the daily result screen.
  Streak rule: any finished daily counts, solved or not; a forfeit or a
  missed day ends it; yesterday keeps it alive until today is over.
- Daily reminders are iOS-only local notifications (no server):
  `droid-game-ios/src/native/reminders.js`, using
  `@capacitor/local-notifications`. The web build imports a do-nothing
  `utils/reminders.js` with the same interface, and the sync script
  repoints the import. The app re-plans a week of 6 pm reminders on every
  open and every finished round, skipping today once it is played. Off
  until the player turns on the switch on the daily result screen.

## Known open items

- The daily round is saved as it is played (`utils/dailyProgress.js`), so
  closing the app mid-round resumes it - same board, placements, hints and
  clock - instead of starting it again. What stays open: the clock is
  paused while the app is backgrounded or closed (a deliberate fix for
  rounds scored as if the phone had been left running), so a player can
  still think away from the clock. Counting time away would close that and
  reopen the original complaint (owner's call).
- All daily limits, and the streak and stats, live in local storage with
  no accounts, so deleting and reinstalling the app, or clearing site data
  on the web, resets them. iCloud key-value sync would carry stats across a
  reinstall on iOS without a login; enforcing the daily limit across
  reinstalls needs a server-side record per player.
