#!/bin/bash
# Hook startowy sesji Claude Code w chmurze: instaluje zależności npm, żeby
# build / lint / tsc działały od pierwszej wiadomości (świeży kontener nie ma
# node_modules). Lokalnie nic nie robi.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm ci tylko gdy brak instalacji albo lockfile jest nowszy — nie zmienia
# package-lock.json (w przeciwieństwie do npm install), więc repo zostaje czyste.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund
fi
