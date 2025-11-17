#!/bin/bash
# Fix files that have _req parameter but use req in the body

find src/controllers -name "*.ts" -type f | while read file; do
  if grep -q "_req: Request" "$file" && grep -q "req\." "$file"; then
    echo "Fixing $file"
    sed -i 's/_req: Request/req: Request/g' "$file"
  fi
done

echo "Done"
