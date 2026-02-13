# Vitest Harness Command Catalog

**Owner:** Developer Experience Team  
**Review cadence:** Monthly and on tooling/script changes

## Targeted Validation Commands

```bash
# Run migrated test file only
npx vitest run tests/<path>/<file>.test.js

# Run battle-focused subsets
npm run test:battles:classic
npm run test:battles:cli
```

## Quality Gates for Harness Changes

```bash
npm run check:jsdoc
npx prettier . --check
npx eslint .
```

## Migration Pattern Audits

```bash
# Find deprecated doMock hook usage
rg -n "vi\.doMock\(" tests -g "!client_embeddings.json"

# Find deprecated harness mocks parameter usage
rg -n "mocks\s*:" tests -g "!client_embeddings.json"

# Verify no synthetic events in tests
grep -r "dispatchEvent\|createEvent" tests/ --exclude=client_embeddings.json

# Verify console discipline
grep -r "console\.(warn\|error)" tests/ --exclude=client_embeddings.json | grep -v "tests/utils/console.js"
```

## Escalation Commands (when scope expands)

```bash
# Full unit suite (use only when justified)
npx vitest run

# CI-equivalent script
npm run test:ci
```
