---
name: judokon-json-authority
description: Creates, modifies, and validates JU-DO-KON! JSON files while preserving schema consistency and downstream compatibility.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: JSON schemas, affected feature specs, validation commands.
- Outputs: schema-safe JSON edits, impact notes, suggested validations.
- Non-goals: schema-breaking changes without explicit approval.

## Trigger conditions

Use this skill when prompts include or imply:

- Editing `judoka.json`, `tooltips.json`, or battle/config JSON.
- Adding metadata/config fields consumed by runtime code.
- Updating JSON-backed content contracts.

## Mandatory rules

- Preserve schema stability and prefer additive changes.
- Provide explicit defaults for new fields.
- Identify impacted consumers before finalizing edits.
- Treat JSON as executable configuration and avoid ambiguous keys.

## Validation checklist

- [ ] Run `npm run validate:data` after JSON edits.
- [ ] Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint .`.
- [ ] Run targeted tests for impacted consumers when behavior changes.

## Expected output format

- JSON change summary with rationale.
- Consumer impact analysis and required follow-up code updates.
- Validation command results.

## Failure/stop conditions

- Stop when requested JSON edits are schema-breaking without approval.
- Stop when downstream impacts cannot be determined confidently.
