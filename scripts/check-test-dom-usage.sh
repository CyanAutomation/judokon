#!/usr/bin/env bash
# Fail if tests use direct document.body.innerHTML or document.body.appendChild
set -euo pipefail
echo "Checking tests for direct DOM body manipulation..."
if command -v rg >/dev/null 2>&1; then
  SEARCHER="rg --hidden -n --glob 'tests/**'"
else
  SEARCHER="grep -RIn -- "
fi

if eval "$SEARCHER 'document\\.body\\.(innerHTML|appendChild|append)'"; then
  echo "Direct body DOM manipulation found in tests. Please use tests/helpers/domUtils.mount instead." >&2
  exit 1
fi

# Also check for bare innerHTML assignments in tests
if eval "$SEARCHER '\\.innerHTML\\s*=\\s*'"; then
  echo "innerHTML assignment found in tests. Prefer mount() or createEl() helpers." >&2
  exit 1
fi

echo "No direct body DOM manipulations found (search returned no matches)."
