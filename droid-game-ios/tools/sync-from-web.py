#!/usr/bin/env python3
"""Regenerate the iOS app's web sources from ../droid-game.

The iOS app is the same React game as the web version plus a small, fixed set
of adaptations for running inside WKWebView. Rather than maintaining a diverged
copy by hand, this script re-copies the web sources and re-applies those
adaptations, so updating the app after the game changes is one command:

    python3 tools/sync-from-web.py && npm run sync

Every edit below is asserted. If the game's source moves out from under a
patch, the script stops and names the patch instead of silently producing an
app with, say, no working tile placement.
"""

import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WEB = os.path.join(ROOT, 'droid-game')
IOS = os.path.join(ROOT, 'droid-game-ios')

# iOS-only files, never overwritten by the copy from the web app.
IOS_ONLY = {
    'src/config.js',
    'src/native',
    'src/styles/ios.css',
    'src/index.js',
    'public/index.html',
    'public/fonts',
}

# Web-hosting files that mean nothing inside an app bundle.
WEB_ONLY = {
    'public/_redirects',
    'public/robots.txt',
}

failures = []


def patch(text, name, old, new, count=1):
    """Replace `old` with `new`, recording a failure if it does not appear once."""
    found = text.count(old)
    if found != count:
        failures.append(f'{name}: expected {count} match(es), found {found}')
        return text
    return text.replace(old, new)


def sync_dependencies():
    """Adopt any dependency the web app has gained.

    The two package.json files are separate because the iOS build adds the
    Capacitor plugins, so a new library in the game (a QR code renderer, say)
    would otherwise only surface as a 'Module not found' at build time.
    Returns the list of packages that changed.
    """
    web_pkg = json.load(open(os.path.join(WEB, 'package.json')))
    ios_path = os.path.join(IOS, 'package.json')
    ios_pkg = json.load(open(ios_path))

    changed = []
    for name, version in web_pkg.get('dependencies', {}).items():
        if ios_pkg['dependencies'].get(name) != version:
            changed.append(f'{name}@{version}')
            ios_pkg['dependencies'][name] = version

    if changed:
        ios_pkg['dependencies'] = dict(sorted(ios_pkg['dependencies'].items()))
        with open(ios_path, 'w') as f:
            json.dump(ios_pkg, f, indent=2)
            f.write('\n')
    return changed


def patch_re(text, name, pattern, repl, count=1):
    """Regex form of `patch`, for edits that must survive reformatting."""
    new, found = re.subn(pattern, repl, text)
    if found != count:
        failures.append(f'{name}: expected {count} match(es), found {found}')
        return text
    return new


def mirror(subdir):
    """Copy web -> ios for a directory, deleting files dropped upstream but
    preserving the iOS-only paths."""
    src_root = os.path.join(WEB, subdir)
    dst_root = os.path.join(IOS, subdir)
    keep = {p[len(subdir) + 1:] for p in IOS_ONLY if p.startswith(subdir + '/')}
    skip = {p[len(subdir) + 1:] for p in WEB_ONLY if p.startswith(subdir + '/')}

    for rel in skip:
        stale = os.path.join(dst_root, rel)
        if os.path.exists(stale):
            os.remove(stale)

    for dirpath, _, filenames in os.walk(dst_root):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, dst_root)
            if any(rel == k or rel.startswith(k + os.sep) for k in keep):
                continue
            if not os.path.exists(os.path.join(src_root, rel)):
                os.remove(full)

    for dirpath, _, filenames in os.walk(src_root):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, src_root)
            if any(rel == k or rel.startswith(k + os.sep) for k in keep):
                continue
            if rel in skip:
                continue
            dst = os.path.join(dst_root, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(full, dst)


def main():
    if not os.path.isdir(WEB):
        sys.exit(f'Cannot find the web app at {WEB}')

    mirror('src')
    mirror('public')

    path = os.path.join(IOS, 'src/components/DroidGame.js')
    s = open(path).read()

    # Tolerates other hooks being added to the import alongside useEffect.
    s = patch_re(
        s, 'useCallback import',
        r"(import React, \{[^}]*?useEffect)",
        r"\1, useCallback",
    )

    s = patch(
        s, 'native imports',
        "import Leaderboard from './Leaderboard';",
        "import Leaderboard from './Leaderboard';\n"
        "import { SHARE_BASE_URL } from '../config';\n"
        "import {\n"
        "  copyText,\n"
        "  isNative,\n"
        "  onShareLinkOpened,\n"
        "  tapFeedback,\n"
        "  resultFeedback,\n"
        "} from '../native/ios';",
    )

    # Native pasteboard. The web fallback lives in native/ios.js.
    s = patch(
        s, 'clipboard',
        """    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);""",
        """    await copyText(url);
    tapFeedback();
    setCopied(true);""",
    )

    # Inside the app window.location is capacitor://localhost, which is
    # meaningless to whoever receives a share link.
    s = patch(
        s, 'share url',
        "      const url = `${window.location.origin}${window.location.pathname}"
        "?g=${encodeShareParam(p1Board, preservedLetters, boardShape)}`;",
        "      const shareOrigin = isNative()\n"
        "        ? SHARE_BASE_URL\n"
        "        : `${window.location.origin}${window.location.pathname}`;\n"
        "      const url = `${shareOrigin}"
        "?g=${encodeShareParam(p1Board, preservedLetters, boardShape)}`;",
    )

    # Shared boards arrive as a droid:// link, not a query string, so the
    # loader has to be callable at any time rather than only on mount.
    s = patch(
        s, 'deep link: loader head',
        """  // On mount: detect ?g= share URL and load Player 2 state directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('g');
    if (!token) return;

    const result = decodeShareParam(token);""",
        """  /** Load a shared board token and drop straight into the Player 2 turn. */
  const loadSharedBoard = useCallback((token) => {
    const result = decodeShareParam(token);""",
    )

    s = patch(
        s, 'deep link: loader tail',
        """    setGameState('player2');
    window.history.replaceState(null, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps""",
        """    setSelectedLetter(null);
    setGameState('player2');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: detect a ?g= share URL and load Player 2 state directly.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('g');
    if (!token) return;
    loadSharedBoard(token);
    window.history.replaceState(null, '', window.location.pathname);
  }, [loadSharedBoard]);

  // On iOS the app never launches with a query string. Shared boards arrive
  // instead as a droid://play?g=... link, which can also fire while the app
  // is already open and warm.
  useEffect(() => onShareLinkOpened(loadSharedBoard), [loadSharedBoard]);""",
    )

    # Tapping the board only ever places or clears; it never leaves a letter
    # selected. Picking the letter up into the hand was tried and reads wrong,
    # because the letter visibly returns to the pool at the same moment.
    s = patch(
        s, 'board tap feedback',
        """      newBoard[y][x] = selectedLetter;
      setBoard(newBoard);
      setSelectedLetter(null);
    } else if (letter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
    }
  };""",
        """      newBoard[y][x] = selectedLetter;
      setBoard(newBoard);
      setSelectedLetter(null);
      tapFeedback();
    } else if (letter) {
      const newBoard = board.map((r) => [...r]);
      newBoard[y][x] = null;
      setBoard(newBoard);
      tapFeedback();
    }
  };""",
    )

    s = patch(
        s, 'letter tap feedback',
        "    setSelectedPoolIndex(isSameTile ? null : index);\n  };",
        "    setSelectedPoolIndex(isSameTile ? null : index);\n"
        "    tapFeedback();\n  };",
    )

    s = patch(
        s, 'invalid word feedback',
        "            `Not a valid English word${badWords.size > 1 ? 's' : ''}"
        ": ${[...badWords].join(', ')}`\n          );",
        "            `Not a valid English word${badWords.size > 1 ? 's' : ''}"
        ": ${[...badWords].join(', ')}`\n          );\n          resultFeedback(false);",
    )

    # Two scoring paths reach a verdict (the two-player turn and the solo
    # finish). Matched by indentation capture so either can be re-nested.
    s = patch_re(
        s, 'turn result feedback',
        r'(?m)^([ \t]+)setPlayer2FullValid\(isFullValid\);$',
        r'\1setPlayer2FullValid(isFullValid);\n\1resultFeedback(isFullValid);',
        count=2,
    )

    if failures:
        print('Sync failed - the web app has moved under these patches:\n')
        for f in failures:
            print(f'  - {f}')
        print('\nOpen tools/sync-from-web.py and update the affected patch to '
              'match the new source, then re-run.')
        sys.exit(1)

    open(path, 'w').write(s)
    print('Synced src/ and public/ from ../droid-game and re-applied '
          '9 iOS adaptations.')

    changed = sync_dependencies()
    if changed:
        print('\nAdopted new dependencies: ' + ', '.join(changed))
        print('Run `npm install` before building.')


if __name__ == '__main__':
    main()
