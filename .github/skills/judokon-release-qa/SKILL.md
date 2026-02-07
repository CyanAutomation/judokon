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

- Go / No-Go assessment
- Risk summary
- Actionable recommendations
