---
name: judokon-test-author
description: Writes and updates automated tests for JU-DO-KON! using Vitest and Playwright. Use whenever logic, state, or behaviour changes.
---

# Skill Instructions

This skill makes verification mandatory.

## Inputs / Outputs / Non-goals

- Inputs: changed logic, affected features, relevant test locations.
- Outputs: updated tests, coverage notes, targeted test commands.
- Non-goals: full suite runs without need or DOM-mutation tests.

## Key files

- `tests/**/*.test.js`
- `playwright/*.spec.js`
- `tests/utils/console.js`
- `src/helpers/classicBattle.js`

## What this skill helps accomplish

- Protect game logic from regressions
- Validate state transitions and rules
- Ensure feature flags behave correctly

## When to use this skill

- Adding or modifying battle logic
- Changing state machines
- Introducing new features or flags
- Fixing bugs

## Testing principles

1. **No logic change without tests**
2. **Test behaviour, not implementation**
3. **State transitions must be explicit**
4. **Feature flags require on/off coverage**

## Test execution

- Prefer targeted runs: `npx vitest run tests/<path>.test.js`
- Use `npm run test:battles:classic` or `npm run test:battles:cli` when relevant.

## DOM discipline

- Do not mutate DOM directly in tests; use component APIs or user-level events.

## Required test types

- State transition tests
- Rule evaluation tests
- Feature flag toggle tests
- Smoke tests for entry wiring

## Operational Guardrails

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Expected output

- New or updated test files
- Clear test descriptions
- Coverage-aware suggestions when gaps exist
