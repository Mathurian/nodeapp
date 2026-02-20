#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIST="${1:-frontend/dist}"

fail() {
  echo "PWA preflight failed: $1" >&2
  exit 1
}

assert_file() {
  local file="$1"
  [ -f "$file" ] || fail "missing file: $file"
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  grep -qE "$pattern" "$file" || fail "$description ($file)"
}

assert_file "$FRONTEND_DIST/index.html"
assert_file "$FRONTEND_DIST/sw.js"
assert_file "$FRONTEND_DIST/manifest.webmanifest"

node - "$FRONTEND_DIST/manifest.webmanifest" <<'NODE'
const fs = require('fs');
const manifestPath = process.argv[2];

const fail = (message) => {
  console.error(`PWA preflight failed: ${message}`);
  process.exit(1);
};

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredFields = ['id', 'name', 'short_name', 'start_url', 'display', 'icons'];
for (const field of requiredFields) {
  if (!(field in manifest)) fail(`manifest missing required field: ${field}`);
}

if (manifest.id !== '/') fail(`manifest.id must be '/' (got ${manifest.id})`);
if (manifest.start_url !== '/') fail(`manifest.start_url must be '/' (got ${manifest.start_url})`);
if (manifest.display !== 'standalone') fail(`manifest.display must be 'standalone' (got ${manifest.display})`);

if (!Array.isArray(manifest.icons) || manifest.icons.length < 4) {
  fail('manifest.icons must include any + maskable icon variants');
}

const mustHave = new Set([
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
]);

const declared = new Set(manifest.icons.map((icon) => String(icon.src || '')));
for (const required of mustHave) {
  if (!declared.has(required)) fail(`manifest.icons missing ${required}`);
}
NODE

assert_file "$FRONTEND_DIST/pwa-192x192.png"
assert_file "$FRONTEND_DIST/pwa-512x512.png"
assert_file "$FRONTEND_DIST/pwa-maskable-192x192.png"
assert_file "$FRONTEND_DIST/pwa-maskable-512x512.png"

assert_contains "$FRONTEND_DIST/index.html" "rel=\"manifest\"" "index.html missing manifest link"
assert_contains "$FRONTEND_DIST/index.html" "name=\"mobile-web-app-capable\"" "index.html missing mobile-web-app-capable meta"

assert_contains "$FRONTEND_DIST/sw.js" "precacheAndRoute" "sw.js missing precache manifest"
assert_contains "$FRONTEND_DIST/sw.js" "manifest\\.webmanifest" "sw.js missing manifest precache entry"
assert_contains "$FRONTEND_DIST/sw.js" "createHandlerBoundToURL\\(\"/index\\.html\"\\)" "sw.js must fallback navigations to /index.html"
assert_contains "$FRONTEND_DIST/sw.js" "\\^\\\\/api\\\\/" "sw.js missing /api denylist"
assert_contains "$FRONTEND_DIST/sw.js" "\\^\\\\/uploads\\\\/" "sw.js missing /uploads denylist"
assert_contains "$FRONTEND_DIST/sw.js" "\\^\\\\/socket\\\\\\.io\\\\/" "sw.js missing /socket.io denylist"

echo "PWA preflight passed for $FRONTEND_DIST"
