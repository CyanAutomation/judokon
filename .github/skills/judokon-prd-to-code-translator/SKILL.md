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

## Expected output

- Implementation checklist
- Suggested file changes
- Test coverage mapping
