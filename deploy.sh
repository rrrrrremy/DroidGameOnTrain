#!/bin/bash
#
# Kept so an old habit still works. It used to `git pull --rebase origin
# main` and deploy without the production checks; ship.sh does it properly
# (right branch, clean tree, tests, audit, then deploy).
exec "$(dirname "$0")/ship.sh" web
