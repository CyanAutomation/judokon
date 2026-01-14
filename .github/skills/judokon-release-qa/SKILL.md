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

## Expected output

- Go / No-Go assessment
- Risk summary
- Actionable recommendations
