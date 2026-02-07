---
name: judokon-pr-delivery
description: Standardizes JU-DO-KON! pull request delivery artifacts with required sections, validation traceability, risk handling, and provenance notes.
---

# Skill Instructions

This skill is the final delivery gate before PR submission.

## Purpose

Create deterministic PR title/body artifacts that are review-ready, traceable to acceptance criteria, and auditable for RAG-informed decisions.

## Trigger conditions

Use this skill when prompts include or imply:

- **"prepare PR"**
- **"write PR description"**
- **"delivery summary"**
- **"final handoff"**

## Required PR title structure

Use: `<scope>: <imperative change summary>`

Rules:

- Keep ≤ 72 characters when possible.
- Start with impacted domain/scope (`battle`, `settings`, `tooltips`, `tests`, `docs`, `skills`).
- Use imperative voice (`add`, `refactor`, `fix`, `standardize`).
- Avoid vague prefixes (`update stuff`, `misc`, `wip`).

Examples:

- `skills: add standardized PR delivery handoff workflow`
- `battle: fix snackbar dismissal registration ordering`

## Required PR body sections (must include all)

1. **Summary**
   - What changed and why (2-6 bullets).
2. **Scope**
   - In-scope vs explicitly out-of-scope items.
3. **Validation Run List**
   - Exact commands executed + PASS/FAIL status.
   - Distinguish targeted tests from core checks.
4. **Risk Assessment**
   - Public API risk, runtime risk, test gap risk, rollout risk.
5. **Rollback / Flag Strategy**
   - How to revert safely and whether feature flags gate behavior.
6. **Acceptance Criteria Mapping**
   - `changed file -> acceptance criterion -> test/validation evidence`.
7. **Provenance Notes (RAG-informed decisions)**
   - Which decisions were informed by RAG vs direct source inspection.
   - Include fallback notes when RAG quality was insufficient.

## Acceptance mapping format (required)

Use a table:

| Changed File | Acceptance Criterion | Verification (Test/Check) | Status |
| ------------ | -------------------- | ------------------------- | ------ |
| `src/...`    | `<criterion>`        | `npx vitest run ...`      | PASS   |

## Provenance note format (required)

Use bullets with explicit source type:

- `RAG`: `<question asked>` -> `<guidance used>` -> `<how applied>`
- `Code`: `<file inspected>` -> `<line/behavior observed>` -> `<decision made>`
- `Fallback`: `<why RAG was insufficient>` -> `<targeted search/files used>`

## Delivery quality gate

Before final PR message is considered complete, verify:

- Every changed file appears in acceptance mapping.
- Every acceptance criterion has at least one validation artifact.
- Risks include severity + mitigation.
- Rollback strategy is executable in one commit revert or flag disable.
- Provenance notes identify RAG-informed decisions and non-RAG evidence.

## Integration handoffs

- Typical predecessors:
  - `judokon-prd-to-code-translator`
  - `judokon-implementation-engineer`
  - `judokon-release-qa`
- This skill produces the final PR title/body payload for repository delivery tooling.

## Output template

```md
## PR Title

<scope>: <imperative summary>

## PR Body

### Summary

- ...

### Scope

- In scope:
  - ...
- Out of scope:
  - ...

### Validation Run List

- [PASS] `<command>`
- [FAIL/WARN] `<command>`

### Risk Assessment

- Public API: <risk + severity + mitigation>
- Runtime/Behavioral: <risk + severity + mitigation>
- Test Coverage: <risk + severity + mitigation>
- Rollout: <risk + severity + mitigation>

### Rollback / Flag Strategy

- Rollback: <revert plan>
- Flags: <flag name/default/state/testing>

### Acceptance Criteria Mapping

| Changed File | Acceptance Criterion | Verification (Test/Check) | Status |
| ------------ | -------------------- | ------------------------- | ------ |
| ...          | ...                  | ...                       | ...    |

### Provenance Notes

- RAG: ...
- Code: ...
- Fallback: ...
```
