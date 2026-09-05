#!/usr/bin/env python3
"""Rebuild the bundled dictionary from the pinned word-list data archive.

Usage: python3 tools/update-dictionary.py /path/to/word-list-4.1.0.tgz
Download: https://registry.npmjs.org/word-list/-/word-list-4.1.0.tgz
Normal builds use the committed output and need no download.
"""
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
SHA512 = 'e2fb4ac87f2519f698f031cb4ca4037c3c4f8b174ae810bfd96dfc4ec3c4d3b59cf2e3eb3086c43b7aaec411526b605fb03c86ea95b8ed410dffdb5f63137a04'

data = Path(sys.argv[1]).read_bytes()
if hashlib.sha512(data).hexdigest() != SHA512:
    sys.exit('Dictionary archive does not match word-list 4.1.0; refusing to import.')

with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
    source = archive.extractfile('package/words.txt').read().decode('utf-8')
    license_text = archive.extractfile('package/license').read().decode('utf-8')

# Every playable word slot is 2–5 letters. Keep only letters that fit tiles.
words = {word.upper() for word in source.splitlines() if re.fullmatch(r'[a-z]{2,5}', word)}
additions = (ROOT / 'tools/dictionary-additions.txt').read_text().splitlines()
for word in additions:
    if not word or word.startswith('#'):
        continue
    if not re.fullmatch(r'[A-Z]{2,5}', word):
        sys.exit(f'Invalid dictionary addition: {word!r}')
    words.add(word)
words = sorted(words)
output = ROOT / 'src/data/english-words.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(words, indent=2) + '\n')
notice = ROOT / 'public/licenses/word-list.txt'
notice.parent.mkdir(parents=True, exist_ok=True)
notice.write_text('word-list 4.1.0 — https://github.com/sindresorhus/word-list\n'
                  'Droid includes its alphabetic 2–5 letter entries.\n\n' + license_text)
print(f'Bundled {len(words):,} words in {output}')
