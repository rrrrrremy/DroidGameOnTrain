#!/bin/bash
set -e
cd "$(dirname "$0")"
git pull --rebase origin main
cd droid-game
CI= npm run build
firebase deploy --only hosting:droidgame
