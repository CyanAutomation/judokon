---
name: judokon-feature-flag-engineer
description: Implements and manages JU-DO-KON! features behind feature flags with observability and safe defaults.
---

# Skill Instructions

This skill ensures controlled experimentation.

## Inputs / Outputs / Non-goals

- Inputs: feature requirements, settings defaults, UI + engine touchpoints.
- Outputs: flag definitions, guarded logic, observability notes, test updates.
- Non-goals: shipping unflagged behavior or changing public APIs silently.

## Key files

- `src/config/settingsDefaults.js`
- `src/pages/settings.html`
- `src/helpers/BattleEngine.js`
- `tests/`

## What this skill helps accomplish

- Safe rollout of new functionality
- Reversible changes
- Debuggable behaviour

## When to use this skill

- Introducing new gameplay features
- Running experiments or trials
- Refactoring risky logic

## Feature flag rules

1. **New features default to OFF**
2. **Flags must be declared centrally**
3. **UI and engine must respect flags**
4. **Expose state via data-\* attributes**

## Rollout checklist

- Flag declared with default OFF and documented usage.
- Guard added in both UI and engine touchpoints.
- On/off coverage in tests where behavior changes.
- Observability via `data-*` attribute or equivalent.

## Operational Guardrails

- **Task Contract (required before implementation):**
  - `inputs`: exact files/data/commands you will use.
  - `outputs`: exact files/tests/docs you will change.
  - `success`: required outcomes (checks/tests/log discipline).
  - `errorMode`: explicit stop condition (for example: ask on public API change).
- **RAG-first rule + fallback process:**
  1. Use `queryRag(...)` first for How/Why/What/Where/Which questions and implementation lookups.
  2. If results are weak, rephrase and run a second RAG query.
  3. If still weak, fall back to targeted `rg`/file search and cite what was checked.
- **Required validation commands + targeted-test policy:**
  - Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
  - Run only targeted tests for changed files (`npx vitest run <path>` / focused Playwright spec). Run full suite only for cross-cutting changes.
- **Critical prohibitions (must not violate):**
  - No dynamic imports in hot paths: `src/helpers/classicBattle*`, `src/helpers/BattleEngine.js`, `src/helpers/battle/*`.
  - No unsilenced `console.warn/error` in tests (use `tests/utils/console.js` helpers).
  - Validate prohibitions with:
    - `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/BattleEngine.js src/helpers/battle 2>/dev/null`
    - `grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"`

## Expected output

- Flag definitions
- Guarded logic
- Observability hooks
