---
name: judokon-release-qa
description: Performs release-level QA checks for JU-DO-KON!, identifying risk, regressions, and readiness gaps.
---

# Skill Instructions

This skill thinks like a release manager.

## Inputs / Outputs / Non-goals

- Inputs: diff summary, validation results, test run status.
- Outputs: Go/No-Go assessment, risk list, next actions.
- Non-goals: rewriting code or skipping required checks.

## Key files

- `AGENTS.md`
- `design/productRequirementsDocuments/prdDevelopmentStandards.md`
- `design/productRequirementsDocuments/prdTestingStandards.md`
- `tests/` and `playwright/`

## What this skill helps accomplish

- Catch issues before merge
- Reduce broken builds
- Improve confidence in changes

## When to use this skill

- Before merging PRs
- Before demos or releases
- After major refactors

## QA checklist

- Architecture respected
- Tests updated and passing
- Feature flags correct
- No orphaned JSON changes

## Go/No-Go rubric

- Go: targeted tests + lint/format checks green and no hot-path violations.
- No-Go: missing tests, failing checks, or schema-breaking JSON changes.

## Reference checks

- `npm run check:jsdoc`, `npx prettier . --check`, `npx eslint .`
- `npm run check:contrast` when UI changes exist

## Operational Guardrails

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Execution handoff target

- For coding execution, hand off to `judokon-implementation-engineer` at `.github/skills/judokon-implementation-engineer/SKILL.md`.

## Expected output

- Go / No-Go assessment
- Risk summary
- Actionable recommendations
