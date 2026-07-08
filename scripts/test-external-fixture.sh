#!/bin/bash
# Run the external fixture test.
#
# Usage: pnpm test:external-fixture
#
# This script:
# 1. Builds the toolkit package
# 2. Packs it into a tarball
# 3. Creates a temp project that installs the tarball
# 4. Runs the test script against the installed package
#
# This catches subpath export misconfiguration that workspace
# tests miss because workspace symlinks bypass the exports map.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap "rm -rf $TMPDIR" EXIT

echo "=== Building toolkit ==="
cd "$REPO_ROOT"
pnpm build

echo "=== Packing toolkit ==="
TARBALL=$(cd "$REPO_ROOT/packages/toolkit" && pnpm pack --pack-destination "$TMPDIR" 2>&1 | grep -o '/[^ ]*\.tgz')
echo "Tarball: $TARBALL"

if [ -z "$TARBALL" ]; then
  echo "ERROR: Failed to find tarball path"
  exit 1
fi

echo "=== Setting up external fixture project ==="
mkdir -p "$TMPDIR/project"
cat > "$TMPDIR/project/package.json" << EOF
{
  "name": "toolkit-external-fixture",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
EOF

cd "$TMPDIR/project"
npm install "$TARBALL" 2>&1 | tail -5

echo "=== Running external fixture test ==="
cp "$REPO_ROOT/tests/external-fixture/test.mjs" .
node test.mjs
