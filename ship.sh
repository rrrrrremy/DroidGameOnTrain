#!/bin/bash
#
# Ship the current branch to both targets: the web app on Firebase Hosting,
# and the iOS app's generated sources ready for Xcode. Then fast-forward
# main to match, so GitHub's default branch shows what is live.
#
#   ./ship.sh          both targets
#   ./ship.sh web      Firebase Hosting only
#   ./ship.sh ios      regenerate the iOS sources only
#
# The web app is the source of truth for all game code; the iOS app's src/
# and public/ are regenerated from it. Doing them in that order means the
# app can never ship game code the site has not seen.

set -euo pipefail
cd "$(dirname "$0")"

BRANCH="preserve-current-localhost"
TARGET="${1:-both}"

case "$TARGET" in
  both|web|ios) ;;
  *) echo "usage: ./ship.sh [both|web|ios]" >&2; exit 2 ;;
esac

# Deliberately NOT `git pull --rebase origin main`. All work lives on
# $BRANCH, and rebasing it onto main would rewrite exactly the history this
# repo is meant to preserve.
current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
  echo "On branch '$current', expected '$BRANCH'." >&2
  echo "Switch with: git checkout $BRANCH" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Uncommitted changes present. Commit or stash them first," >&2
  echo "so what ships matches what is in the branch." >&2
  git status --short >&2
  exit 1
fi

echo "==> Fetching $BRANCH"
git pull origin "$BRANCH"

if [ "$TARGET" = "both" ] || [ "$TARGET" = "web" ]; then
  echo
  echo "==> Deploying the web app to droidgame.web.app"
  ( cd droid-game && npm run deploy )
fi

if [ "$TARGET" = "both" ] || [ "$TARGET" = "ios" ]; then
  echo
  echo "==> Regenerating the iOS sources"
  # npm install first: a new Capacitor plugin in package.json (local
  # notifications, say) is otherwise a "Module not found" at build time.
  ( cd droid-game-ios && npm install --no-audit --no-fund && python3 tools/sync-from-web.py && npm run sync )
  echo
  echo "iOS sources are current. Open Xcode and archive:"
  echo "  open droid-game-ios/ios/App/App.xcworkspace"
fi

# main is a mirror of $BRANCH, so the GitHub front page shows what is live.
# Fast-forward only: if main ever gains commits of its own, it is left alone
# rather than overwritten.
echo
echo "==> Updating main to match $BRANCH"
git fetch origin main --quiet || true
if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  git push origin HEAD:main || echo "Could not update main (network?). Run ./ship.sh again later." >&2
else
  echo "main has commits that are not on $BRANCH; left it alone." >&2
fi

echo
echo "Done."
