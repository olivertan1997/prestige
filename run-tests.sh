#!/usr/bin/env bash
# Prestige Interior Design - runs ALL automated test cases (6 project specifications + 12 user stories,
# SHA-256 password hashing and a smoke test of every page) and prints "Feature N: Good" per feature.
# Needs Node.js 22+. Usage: bash run-tests.sh
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm ci; fi
npm test
