# Droid

A React word-strategy game hosted on Firebase Hosting.

## Requirements

- Node.js 20 or newer
- npm
- Firebase CLI authenticated against the `onebitcoin-38ea0` project

## Local Development

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Production Checks

Word validation runs entirely on-device using the generator's vocabulary
plus 19,786 alphabetic 2–5 letter entries: `word-list` 4.1.0 and
315 reviewed additions from ESDB 2026.02.25. See `tools/DICTIONARY.md`. The bundled
list is the authority for player answers; it does not include every English
word, and the upstream list filters many offensive words. Generator lists
stay separate so this update does not change daily puzzles.

The data lives in `src/data/english-words.json`. To reproduce it, download
https://registry.npmjs.org/word-list/-/word-list-4.1.0.tgz and run
`python3 tools/update-dictionary.py /path/to/word-list-4.1.0.tgz`.
The importer verifies the pinned archive checksum. Normal builds do not
download anything. The MIT license and underlying atebits/Words CC0 notice
are shipped in `public/licenses/` and copied into the iOS bundle by sync.
Old `droid_word_verdicts` entries are ignored because API answers must not
override this dictionary.

Run these before deploying:

```bash
npm run check:prod
```

Expected result:

- Tests pass
- Production build compiles successfully
- Production dependency audit reports `found 0 vulnerabilities`

## Deploy

```bash
npm run deploy
```

This runs the production checks, builds the app, and deploys the `build` folder to Firebase Hosting site `droidgame`.
It also deploys the Firestore leaderboard index used by the fast first-load query.

Equivalent manual command:

```bash
npm run build
firebase deploy --only hosting:droidgame,firestore:indexes
```
