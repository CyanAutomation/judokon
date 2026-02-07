---
name: judokon-test-author
description: Writes and updates automated tests for JU-DO-KON! using Vitest and Playwright. Use whenever logic, state, or behaviour changes.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: changed logic, affected features, relevant test locations.
- Outputs: updated tests, coverage notes, targeted test commands.
- Non-goals: unnecessary full-suite runs or DOM-mutation testing.

## Trigger conditions

Use this skill when prompts include or imply:

- Adding or modifying battle logic.
- Changing state transitions or gameplay rules.
- Introducing feature flags or bug fixes.

## Mandatory rules

- No logic change without tests.
- Test behavior through public APIs/user interactions; avoid direct DOM mutation.
- Cover state transitions and feature-flag on/off behavior.
- Prefer targeted Vitest/Playwright runs for changed areas.
- Keep test logs clean (no unsilenced `console.warn/error`).

## Validation checklist

- [ ] Happy-path and edge-case coverage added for new behavior.
- [ ] Targeted test commands executed (e.g., `npx vitest run tests/<path>.test.js`).
- [ ] Relevant battle test scripts used when applicable (`npm run test:battles:classic`, `npm run test:battles:cli`).
- [ ] Console discipline and timer determinism expectations met.

## Expected output format

- List of new/updated test files with behavior covered.
- Exact test commands run and outcomes.
- Coverage gap notes and recommended follow-ups.

## Failure/stop conditions

- Stop when required behavior cannot be tested deterministically.
- Stop when requested test strategy depends on prohibited anti-patterns.
