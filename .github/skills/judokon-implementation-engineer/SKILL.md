---
name: judokon-implementation-engineer
description: Executes scoped JU-DO-KON! code changes safely, translating approved plans into implementation, validation, and delivery artifacts.
---

# Skill Instructions

This skill is the execution handoff target after planning/translation and before final QA.

## Trigger conditions

Use this skill when prompts include or imply:

- **"implement feature"**
- **"apply fix"**
- **"refactor module"**

## Key files

- `AGENTS.md`
- `src/helpers/BattleEngine.js`
- `src/helpers/classicBattle.js`
- `tests/`
- `playwright/`

## Required sequence (must follow in order)

Required execution flow: **context acquisition → task contract → implementation constraints → targeted validation → delivery summary**.

1. **Context acquisition**
   - Review AGENTS/prior planning artifacts and run RAG-first queries for How/Why/What/Where/Which uncertainties.
   - Confirm impacted files, constraints, and non-goals before editing.
2. **Task contract**
   - Declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
3. **Implementation constraints**
   - Apply minimal, deterministic changes aligned to existing architecture.
   - Respect hot-path import policy and test log discipline.
4. **Targeted validation**
   - Run targeted tests mapped to changed files first, then required lint/format/jsdoc checks.
   - Include contrast checks for visual/UI changes.
5. **Delivery summary**
   - Provide changed-file summary, requirement/test mapping, and explicit risk notes.

## Explicit rules

### Public API changes

- Treat exported module interfaces, schemas, and user-facing contracts as public API.
- **Do not change public API silently.**
- If change is required, document:
  - reason,
  - compatibility impact,
  - migration path or fallback behavior,
  - tests proving compatibility (or intentional break).

### Feature-flag gating

- New behavior that could alter user experience or rollout risk should be gated behind an explicit feature flag.
- Default flags to safe/off behavior unless requirements state otherwise.
- Add/adjust tests for both enabled and disabled states.
- Avoid deleting legacy behavior until flag-removal criteria are met.

### Function-size and modularity checks

- Keep functions at or below 50 lines where feasible.
- Split mixed-responsibility functions into focused helpers.
- Add or update JSDoc (`@pseudocode`) for public/complex functions.
- Prefer composable pure helpers for logic-heavy paths.

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

## Output template

Use this structure in delivery (must include changed files, test mapping, and risk notes):

```md
## Execution Summary

- Changed files:
  - `<path>`: <what changed + why>

## Test Mapping

- `<requirement or behavior>` -> `<test file>` -> `<command run + pass/fail>`

## Validation

- Formatting/Lint/JSDoc:
  - `<command>`: PASS/FAIL
- Targeted tests:
  - `<command>`: PASS/FAIL

## Risk Notes

- Public API impact: none | <details>
- Feature-flag impact: none | <flag + rollout notes>
- Residual risks: <list>
```

## Handoff and integration

- Accepts handoff from:
  - `judokon-planning-and-investigation`
  - `judokon-prd-to-code-translator`
- Produces implementation artifacts consumed by:
  - `judokon-test-author`
  - `judokon-release-qa`
