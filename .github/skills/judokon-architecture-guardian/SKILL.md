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

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Check yourself

- No dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`).
- Engine logic has no DOM access; UI does not own rules.
- New logic behind flags when experimental.

## Expected output

- Clear explanation of where changes belong
- Suggested module placement
- Warnings when boundaries are crossed
