# Testing Documentation Hub

> **Scope:** Authoritative map of JU-DO-KON! testing documentation lanes.
> **When to read this:** Start here to choose the right testing doc for architecture policy, author workflow, or harness internals.

## Lanes

### 1) Architecture and policy (canonical)

- [`docs/TESTING_ARCHITECTURE.md`](../TESTING_ARCHITECTURE.md)
- Use for durable testing architecture decisions, anti-pattern policy, and migration direction.

### 2) Author quickstart

- [`tests/TESTING_ARCHITECTURE.md`](../../tests/TESTING_ARCHITECTURE.md)
- Use for fast day-to-day authoring workflow and pre-commit checklist.

### 3) Harness internals and migration

- [`docs/testing/harness-architecture.md`](./harness-architecture.md)
- [`docs/testing/harness-migration-playbook.md`](./harness-migration-playbook.md)
- [`docs/status/reference/harness-migration-log.md`](../status/reference/harness-migration-log.md)
- Use for harness internals, migration execution mechanics, and status tracking.

## Canonical Validation Command Reference

Use this section as the single command source to avoid duplication across testing docs.

```bash
npx vitest run <relevant-test-files>
npx eslint .
npx prettier . --check
npm run check:jsdoc
```

Optional hygiene checks:

```bash
grep -RInE "console\.(warn|error)\(" tests --exclude=client_embeddings.json | grep -v "tests/utils/console.js"
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null
```

## Deterministic Battle Test Hooks

For production pages, do not rely on URL params for test-only behavior. Use `src/helpers/testApi.js` hooks instead:

- `window.__TEST_API.init.configureClassicBattle({ skipRoundCooldown: true })` for cooldown skipping.
- `window.__TEST_API.timers.skipCooldown()` to advance cooldown deterministically.
- `window.__FF_OVERRIDES` only for explicit test overrides when bootstrapping a page under automation.
