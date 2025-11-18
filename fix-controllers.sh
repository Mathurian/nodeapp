#!/bin/bash

# Script to automatically fix controller parameter destructuring
# Replaces: const { id } = req.params;
# With: const id = getRequiredParam(req, 'id');

# Files to fix
files=(
  "src/controllers/EmailTemplateController.ts"
  "src/controllers/CustomFieldController.ts"
  "src/controllers/tenantController.ts"
  "src/controllers/scoreFileController.ts"
  "src/controllers/printController.ts"
  "src/controllers/drController.ts"
  "src/controllers/customFieldsController.ts"
  "src/controllers/workflowController.ts"
  "src/controllers/scoreRemovalController.ts"
  "src/controllers/commentaryController.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add import if not present
    if ! grep -q "import.*getRequiredParam.*from.*routeHelpers" "$file"; then
      # Find the last import line
      last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_import" ]; then
        sed -i "${last_import}a import { getRequiredParam } from '../utils/routeHelpers';" "$file"
      fi
    fi

    # Fix parameter destructuring patterns
    # Pattern 1: const { id } = req.params;
    sed -i "s/const { \([a-zA-Z][a-zA-Z0-9]*\) } = req\.params;/const \1 = getRequiredParam(req, '\1');/g" "$file"

    # Pattern 2: const { param1, param2 } = req.params;
    # This is more complex and needs manual handling

    echo "  ✓ Fixed $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo "Done! Please review changes before committing."
