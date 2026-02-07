---
name: judokon-feature-flag-engineer
description: Implements and manages JU-DO-KON! features behind feature flags with observability and safe defaults.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: feature requirements, settings defaults, UI + engine touchpoints.
- Outputs: flag definitions, guarded logic, observability notes, test updates.
- Non-goals: shipping unflagged behavior or changing public APIs silently.

## Trigger conditions

Use this skill when prompts include or imply:

- Introducing new gameplay features.
- Running experiments or phased rollouts.
- Refactoring risky behavior that should remain reversible.

## Mandatory rules

- New features default to OFF.
- Declare flags centrally in settings defaults.
- Guard both UI and engine behavior behind the same flag.
- Expose flag state via `data-*` attributes or equivalent observability hook.
- Preserve existing behavior when a flag is disabled.

## Validation checklist

- [ ] Flag added with default OFF and documented usage.
- [ ] On/off behavior covered by targeted tests.
- [ ] Core checks run: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
- [ ] Dynamic import and console discipline checks run.

## Expected output format

- Flag definition details (name, default, scope).
- Guarded code paths (UI + engine) and observability notes.
- Validation evidence including targeted on/off test commands.

## Failure/stop conditions

- Stop if rollout cannot be made reversible.
- Stop if requested behavior bypasses centralized flag declaration.
