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

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Execution handoff target

- For coding execution, hand off to `judokon-implementation-engineer` at `.github/skills/judokon-implementation-engineer/SKILL.md`.

## Expected output

- Implementation checklist
- Suggested file changes
- Test coverage mapping
