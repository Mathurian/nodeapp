#!/bin/bash

# Fix unused parameters by prefixing with underscore
# This script processes TypeScript files to fix TS6133 errors for unused parameters

echo "Finding unused parameters..."

# Get list of files with TS6133 errors for parameters
npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1 | \
  grep "error TS6133" | \
  grep "is declared but its value is never read" | \
  cut -d'(' -f1 | \
  sort -u | \
  while read -r file; do
    if [ -f "$file" ]; then
      echo "Processing $file..."

      # Fix unused 'req' parameters
      sed -i 's/\(async\s*(\s*\)req\(\s*:\s*Request\)/\1_req\2/g' "$file"
      sed -i 's/\(=\s*async\s*(\s*\)req\(\s*:\s*Request\)/\1_req\2/g' "$file"

      # Fix other common unused parameters like 'next', 'res' when they're first param
      # Only if they appear as function parameters

    fi
  done

echo "Done fixing unused parameters"
