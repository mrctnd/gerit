#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$PROJECT_ROOT"

if [ ! -d node_modules ]; then
  npm ci --omit=dev
fi

npm run setup
npm start
