---
name: judokon-release-qa
description: Performs release-level QA checks for JU-DO-KON!, identifying risk, regressions, and readiness gaps.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: diff summary, validation results, test run status.
- Outputs: Go/No-Go assessment, risk list, next actions.
- Non-goals: rewriting code or skipping required checks.

## Trigger conditions

Use this skill when prompts include or imply:

- Pre-merge QA review.
- Release-readiness checks.
- Post-refactor risk validation.

## Mandatory rules

- Evaluate architecture alignment, test coverage, feature-flag correctness, and JSON/data integrity.
- Apply Go/No-Go rubric: Go only when targeted tests and core checks are green with no critical policy violations.
- Surface blocking risks with actionable remediation steps.

## Validation checklist

- [ ] Core checks reviewed: `npm run check:jsdoc`, `npx prettier . --check`, `npx eslint .`.
- [ ] `npm run check:contrast` included when UI changes exist.
- [ ] Targeted tests mapped to changed areas are passing.
- [ ] Hot-path dynamic import and console discipline checks are clean.

## Expected output format

- Go/No-Go decision.
- Prioritized risk summary with severity and owner/action.
- Clear list of must-fix vs follow-up recommendations.

## Failure/stop conditions

- Stop with No-Go when required checks are missing or failing.
- Stop with No-Go when high-severity risks lack mitigation.
