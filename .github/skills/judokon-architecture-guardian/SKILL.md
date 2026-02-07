---
name: judokon-architecture-guardian
description: Enforces JU-DO-KON! architectural boundaries, module responsibilities, and design intent. Use when designing, refactoring, or reviewing core game logic.
---

# Skill Instructions

This skill ensures that all changes respect the established JU-DO-KON! architecture.

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, architecture docs, core engine/UI modules, refactor diffs.
- Outputs: boundary-compliant change guidance, module placement advice, risk callouts.
- Non-goals: redesigning architecture or altering public APIs without approval.

## Key files

- `src/helpers/classicBattle.js`
- `src/helpers/battleEngineFacade.js`
- `src/components/Scoreboard.js`
- `design/productRequirementsDocuments/prdDevelopmentStandards.md`

## What this skill helps accomplish

- Prevent architectural drift
- Maintain separation of concerns
- Preserve the Battle Engine mental model
- Ensure UI, engine, and data layers remain decoupled

## When to use this skill

- Adding new game modes
- Refactoring battle logic
- Modifying state machines
- Reviewing AI-generated code for correctness

## Core architectural rules (must follow)

1. **Battle Engine owns rules and outcomes**
   - No game rules in UI components
   - No DOM access inside engine logic
2. **UI is reactive, not authoritative**
   - UI reads state, never mutates it directly
3. **JSON is the source of truth**
   - Battle states, judoka data, and configuration live in JSON
4. **Facades define boundaries**
   - External callers interact through facades, not internals
5. **Feature flags gate behaviour**
   - Experimental logic must be flag-protected

## Boundary examples

- UI can render a timer display; engine computes timer state and transitions.
- UI reads state from facades; engine never imports or touches DOM helpers.

## Anti-patterns (must avoid)

- Business logic inside rendering functions
- Implicit coupling between UI and engine internals
- Duplicated rule definitions across files

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

## Check yourself

- No dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`).
- Engine logic has no DOM access; UI does not own rules.
- New logic behind flags when experimental.

## Expected output

- Clear explanation of where changes belong
- Suggested module placement
- Warnings when boundaries are crossed
