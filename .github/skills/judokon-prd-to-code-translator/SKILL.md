---
name: judokon-prd-to-code-translator
description: Translates JU-DO-KON! PRD sections into implementation plans, code changes, and tests.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, acceptance criteria, non-goals.
- Outputs: implementation checklist, file targets, test mapping.
- Non-goals: coding without confirmed requirements.

## Trigger conditions

Use this skill when prompts include or imply:

- Starting a new feature from PRD requirements.
- Reviewing scope before implementation.
- Converting acceptance criteria into testable tasks.

## Mandatory rules

- Map functional requirements to concrete modules/files.
- Map acceptance criteria to specific tests/validation commands.
- Preserve PRD non-goals as explicit exclusions.
- Call out missing or ambiguous requirements before coding.

## Validation checklist

- [ ] Requirement → file mapping is complete.
- [ ] Acceptance criteria → test/check mapping is complete.
- [ ] Ambiguities and assumptions are documented.
- [ ] Handoff target for implementation is explicit.

## Expected output format

- Structured matrix: Requirement → File(s) → Test(s)/Validation.
- Explicit section for non-goals and unresolved ambiguities.
- Recommended implementation handoff notes.

## Failure/stop conditions

- Stop if PRD requirements are contradictory or incomplete.
- Stop if acceptance criteria cannot be mapped to verifiable checks.
