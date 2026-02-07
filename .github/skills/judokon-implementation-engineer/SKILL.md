---
name: judokon-implementation-engineer
description: Executes scoped JU-DO-KON! code changes safely, translating approved plans into implementation, validation, and delivery artifacts.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: approved plan/translation artifacts, impacted source files, relevant tests.
- Outputs: scoped implementation, validation evidence, delivery-ready summary.
- Non-goals: broad refactors outside scope or silent public API changes.

## Trigger conditions

Use this skill when prompts include or imply:

- Implement feature.
- Apply fix.
- Refactor module.

## Mandatory rules

- Follow sequence: context acquisition → task contract → implementation constraints → targeted validation → delivery summary.
- Treat exported interfaces/schemas/user-facing contracts as public API; document compatibility impact before changing.
- Gate risky user-facing behavior behind feature flags with safe defaults.
- Keep functions focused (≤50 lines where feasible) and add JSDoc `@pseudocode` for public/complex functions.
- Respect hot-path import policy and test log discipline.

## Validation checklist

- [ ] Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
- [ ] Run targeted tests mapped to changed files first.
- [ ] Validate no hot-path dynamic imports.
- [ ] Validate no unsilenced `console.warn/error` in tests.

## Expected output format

- Execution summary listing changed files and reasons.
- Requirement/test mapping with exact commands and pass/fail status.
- Risk notes: public API impact, flag impact, and residual risks.

## Failure/stop conditions

- Stop when requested changes require unapproved breaking API/schema modifications.
- Stop when required checks fail and cannot be remediated within scope.
