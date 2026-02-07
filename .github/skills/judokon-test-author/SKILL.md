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

- **Task Contract (required before implementation):**
  - `inputs`: exact files/data/commands you will use.
  - `outputs`: exact files/tests/docs you will change.
  - `success`: required outcomes (checks/tests/log discipline).
  - `errorMode`: explicit stop condition (for example: ask on public API change).
- **RAG-first policy:**
  1. Use `queryRag(...)` first for How/Why/What/Where/Which questions and implementation lookups.
  2. If results are weak, rephrase and run a second RAG query.
  3. If still weak, fall back to targeted `rg`/file search and cite what was checked.
- **Required validation + targeted testing:**
  - Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
  - Run only targeted tests for changed files (`npx vitest run <path>` / focused Playwright spec). Run full suite only for cross-cutting changes.
- **Critical prohibitions (must not violate):**
  - No dynamic imports in hot paths: `src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`, `src/helpers/battle/*`.
  - No unsilenced `console.warn/error` in tests (use `tests/utils/console.js` helpers).

## Execution handoff target

- For coding execution, hand off to `judokon-implementation-engineer` at `.github/skills/judokon-implementation-engineer/SKILL.md`.

## Expected output

- New or updated test files
- Clear test descriptions
- Coverage-aware suggestions when gaps exist
