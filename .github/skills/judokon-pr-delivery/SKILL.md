---
name: judokon-pr-delivery
description: Standardizes JU-DO-KON! pull request delivery artifacts with required sections, validation traceability, risk handling, and provenance notes.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: implementation summary, changed file list, validation run results, risk notes.
- Outputs: PR title + body artifacts that satisfy repository delivery standards.
- Non-goals: changing implementation scope at delivery time.

## Trigger conditions

Use this skill when prompts include or imply:

- Prepare PR.
- Write PR description.
- Final handoff or delivery summary.

## Mandatory rules

- PR title must follow `<scope>: <imperative summary>`.
- PR body must include: Summary, Scope, Validation Run List, Risk Assessment, Rollback/Flag Strategy, Acceptance Criteria Mapping, Provenance Notes.
- Include every changed file in acceptance mapping with validation evidence.
- Distinguish RAG-informed decisions from direct code/source inspection.

## Validation checklist

- [ ] Title is scoped, imperative, and concise.
- [ ] All required body sections are present.
- [ ] Acceptance mapping covers all changed files.
- [ ] Validation commands include pass/fail status.
- [ ] Risks include severity and mitigation.

## Expected output format

- `PR Title` section with one line title.
- `PR Body` section with required subsections and acceptance table.
- Provenance bullets labeled `RAG`, `Code`, and `Fallback` where relevant.

## Failure/stop conditions

- Stop if validation evidence is missing for changed files.
- Stop if acceptance criteria cannot be mapped to concrete checks.
