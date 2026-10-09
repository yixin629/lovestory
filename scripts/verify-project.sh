#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
cd "${project_root}"

echo "Verifying project prerequisites and production build..."

command -v node >/dev/null 2>&1 || {
  echo "ERROR: Node.js is not installed." >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || {
  echo "ERROR: npm is not installed." >&2
  exit 1
}

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local is missing." >&2
  echo "Run: cp .env.local.example .env.local" >&2
  exit 1
fi

node --version
npm --version

npm ci
npm run check

echo "Project verification passed."
