---
name: judokon-implementation-engineer
description: Executes scoped JU-DO-KON! code changes safely, translating approved plans into implementation, validation, and delivery artifacts.
---

# Skill Instructions

This skill is the execution handoff target after planning/translation and before final QA.

## Trigger conditions

Use this skill when prompts include or imply:

- **"implement feature"**
- **"apply fix"**
- **"refactor module"**

## Required sequence (must follow in order)

1. **Context acquisition**
   - Review AGENTS/prior planning artifacts and run RAG-first queries for How/Why/What/Where/Which uncertainties.
   - Confirm impacted files, constraints, and non-goals before editing.
2. **Task contract**
   - Declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
3. **Implementation constraints**
   - Apply minimal, deterministic changes aligned to existing architecture.
   - Respect hot-path import policy and test log discipline.
4. **Targeted validation**
   - Run targeted tests mapped to changed files first, then required lint/format/jsdoc checks.
   - Include contrast checks for visual/UI changes.
5. **Delivery summary**
   - Provide changed-file summary, requirement/test mapping, and explicit risk notes.

## Explicit rules

### Public API changes

- Treat exported module interfaces, schemas, and user-facing contracts as public API.
- **Do not change public API silently.**
- If change is required, document:
  - reason,
  - compatibility impact,
  - migration path or fallback behavior,
  - tests proving compatibility (or intentional break).

### Feature-flag gating

- New behavior that could alter user experience or rollout risk should be gated behind an explicit feature flag.
- Default flags to safe/off behavior unless requirements state otherwise.
- Add/adjust tests for both enabled and disabled states.
- Avoid deleting legacy behavior until flag-removal criteria are met.

### Function-size and modularity checks

- Keep functions at or below 50 lines where feasible.
- Split mixed-responsibility functions into focused helpers.
- Add or update JSDoc (`@pseudocode`) for public/complex functions.
- Prefer composable pure helpers for logic-heavy paths.

## Output template

Use this structure in delivery:

```md
## Execution Summary

- Changed files:
  - `<path>`: <what changed + why>

## Test Mapping

- `<requirement or behavior>` -> `<test file>` -> `<command run + pass/fail>`

## Validation

- Formatting/Lint/JSDoc:
  - `<command>`: PASS/FAIL
- Targeted tests:
  - `<command>`: PASS/FAIL

## Risk Notes

- Public API impact: none | <details>
- Feature-flag impact: none | <flag + rollout notes>
- Residual risks: <list>
```

## Handoff and integration

- Accepts handoff from:
  - `judokon-planning-and-investigation`
  - `judokon-prd-to-code-translator`
- Produces implementation artifacts consumed by:
  - `judokon-test-author`
  - `judokon-release-qa`
