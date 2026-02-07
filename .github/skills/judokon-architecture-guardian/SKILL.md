---
name: judokon-architecture-guardian
description: Enforces JU-DO-KON! architectural boundaries, module responsibilities, and design intent. Use when designing, refactoring, or reviewing core game logic.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, architecture docs, core engine/UI modules, refactor diffs.
- Outputs: boundary-compliant change guidance, module placement advice, risk callouts.
- Non-goals: redesigning architecture or altering public APIs without approval.

## Trigger conditions

Use this skill when prompts include or imply:

- Adding new game modes.
- Refactoring battle logic or state machines.
- Reviewing AI-generated code for architectural correctness.

## Mandatory rules

- Battle Engine owns rules and outcomes; UI does not own gameplay rules.
- Engine logic must not access DOM APIs.
- UI is reactive and reads state via facades instead of mutating engine state directly.
- JSON remains the source of truth for battle states, judoka data, and configuration.
- Experimental behavior must be feature-flagged.
- Avoid anti-patterns: business logic in rendering functions, implicit UI/engine coupling, duplicated rule definitions.

## Validation checklist

- [ ] Validate no dynamic imports in hot paths: `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/BattleEngine.js src/helpers/battle 2>/dev/null`.
- [ ] Validate no unsilenced `console.warn/error` in tests: `grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"`.
- [ ] Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
- [ ] Run targeted tests for changed files.

## Expected output format

- Boundary assessment with exact module placement guidance.
- Violations list (if any) with remediation suggestions.
- Risk notes for coupling, API, and feature-flag exposure.

## Failure/stop conditions

- Stop when a requested change requires unapproved public API or architectural boundary breaks.
- Stop when required validations cannot be executed and provide blocker details.
