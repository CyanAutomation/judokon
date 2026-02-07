---
name: judokon-prd-to-code-translator
description: Translates JU-DO-KON! PRD sections into implementation plans, code changes, and tests.
---

# Skill Instructions

This skill turns intent into execution.

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, acceptance criteria, non-goals.
- Outputs: implementation checklist, file targets, test mapping.
- Non-goals: coding without confirmed requirements.

## Key files

- `design/productRequirementsDocuments/*.md`
- `src/`
- `tests/`
- `playwright/`

## What this skill helps accomplish

- Faithful PRD implementation
- Traceability from requirement to code
- Reduced rework

## When to use this skill

- Starting a new feature
- Reviewing scope before coding
- Validating completeness

## Translation rules

- Functional Requirements → modules
- Acceptance Criteria → tests
- Non-goals → explicit exclusions

## Output format

- Requirement → File(s) → Test(s)
- Call out missing or ambiguous PRD items explicitly.

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

- Implementation checklist
- Suggested file changes
- Test coverage mapping
