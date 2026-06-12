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
