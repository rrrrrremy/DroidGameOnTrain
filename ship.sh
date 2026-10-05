#!/bin/bash
#
# The one command for getting Droid out of the repo and onto devices.
#
#   ./ship.sh          release: website live + iOS app ready to archive
#   ./ship.sh web      release the website only
#   ./ship.sh ios      prepare the iOS app for an App Store archive only
#   ./ship.sh test     iOS testing build: daily limit off, "TEST BUILD"
#                      badge, for the simulator or a cabled phone. Never
#                      archive this one.
#
# Every run ends with a short report of warnings and errors, copied to the
# clipboard on a Mac (and kept in .ship-logs/latest-report.txt).
#
# Every mode pulls the branch first and installs dependencies, so a new
# Capacitor plugin can never surface as "Module not found". Release modes
# then fast-forward main so GitHub's front page shows what is live.
#
# The web app is the source of truth for all game code; the iOS app's src/
# and public/ are regenerated from it. Doing them in that order means the
# app can never ship game code the site has not seen.

set -euo pipefail
cd "$(dirname "$0")"

BRANCH="preserve-current-localhost"
TARGET="${1:-both}"

case "$TARGET" in
  both|web|ios|test) ;;
  *) echo "usage: ./ship.sh [both|web|ios|test]" >&2; exit 2 ;;
esac

# ── Report ───────────────────────────────────────────────────────────────
# Everything below is also written to .ship-logs/. When the script ends -
# finished or failed - the warnings and errors are pulled into a short
# report and copied to the clipboard (on a Mac), ready to paste to Claude.
LOG_DIR=".ship-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/ship-$(date +%Y%m%d-%H%M%S).log"
REPORT="$LOG_DIR/latest-report.txt"
exec > >(tee -a "$LOG") 2>&1

report() {
  local status=$?
  set +e
  sleep 1   # let tee finish writing the log
  local clean="$LOG_DIR/.clean.log"
  # Strip colour codes; written so the BSD sed on macOS understands it too.
  sed "s/$(printf '\033')\[[0-9;]*[A-Za-z]//g" "$LOG" > "$clean"
  local deprecations
  deprecations=$(grep -ci 'npm warn deprecated' "$clean")
  {
    if [ "$status" -eq 0 ]; then
      echo "./ship.sh $TARGET: finished OK"
    else
      echo "./ship.sh $TARGET: FAILED (exit $status)"
    fi
    echo "$(date '+%Y-%m-%d %H:%M') · commit $(git rev-parse --short HEAD 2>/dev/null) on $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    echo
    echo "Warnings and errors:"
    # Also ESLint's "Line 12:7: ..." findings, which carry no keyword.
    grep -iE 'warn|error|fail|fatal|vulnerab|denied|not found|cannot|\[!\]|line [0-9]+:[0-9]+' "$clean" \
      | grep -viE 'npm warn deprecated|found 0 vulnerabilities|no-audit' \
      | awk '!seen[$0]++' | head -n 60 > "$clean.hits"
    if [ -s "$clean.hits" ]; then cat "$clean.hits"; else echo "  (none)"; fi
    [ "$deprecations" -gt 0 ] && echo "  (+ $deprecations npm 'deprecated' notices, left out: not actionable)"
    if [ "$status" -ne 0 ]; then
      echo
      echo "Last 40 lines:"
      tail -n 40 "$clean"
    fi
    echo
    echo "Full log: $LOG"
  } > "$REPORT"
  rm -f "$clean" "$clean.hits"

  echo
  if command -v pbcopy >/dev/null 2>&1; then
    pbcopy < "$REPORT"
    echo "==> Report copied to your clipboard. Paste it to Claude."
  else
    echo "==> Report saved to $REPORT"
  fi
}
trap report EXIT

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
  ( cd droid-game && npm install --no-audit --no-fund && npm run deploy )
fi

if [ "$TARGET" = "both" ] || [ "$TARGET" = "ios" ] || [ "$TARGET" = "test" ]; then
  echo
  if [ "$TARGET" = "test" ]; then
    echo "==> Building the iOS TESTING app (daily limit off)"
    SYNC="sync:testing"
  else
    echo "==> Building the iOS app"
    SYNC="sync"
  fi
  ( cd droid-game-ios \
      && npm install --no-audit --no-fund \
      && python3 tools/sync-from-web.py \
      && npm run "$SYNC" )

  echo
  if [ "$TARGET" = "test" ]; then
    echo "Testing build ready. In Xcode: Product > Clean Build Folder, then Run."
    echo "It shows a TEST BUILD badge. Do not archive it; run ./ship.sh ios first."
  else
    echo "iOS app ready. In Xcode: Product > Archive, then Distribute"
    echo "(leave 'Manage version and build number' unticked)."
  fi
  # Open the workspace on a Mac; elsewhere just say where it is.
  if [ "$(uname)" = "Darwin" ]; then
    open droid-game-ios/ios/App/App.xcworkspace
  else
    echo "  droid-game-ios/ios/App/App.xcworkspace"
  fi
fi

# main is a mirror of $BRANCH, so the GitHub front page shows what is live.
# Only after a release, and fast-forward only: if main ever gains commits of
# its own, it is left alone rather than overwritten.
if [ "$TARGET" != "test" ]; then
  echo
  echo "==> Updating main to match $BRANCH"
  git fetch origin main --quiet || true
  if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
    git push origin HEAD:main || echo "Could not update main (network?). Run ./ship.sh again later." >&2
  else
    echo "main has commits that are not on $BRANCH; left it alone." >&2
  fi
fi

echo
echo "Done."
