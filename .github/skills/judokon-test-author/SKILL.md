---
name: judokon-test-author
description: Writes and updates automated tests for JU-DO-KON! using Vitest and Playwright. Use whenever logic, state, or behaviour changes.
---

# Skill Instructions

This skill makes verification mandatory.

## What this skill helps accomplish
- Protect game logic from regressions
- Validate state transitions and rules
- Ensure feature flags behave correctly

## When to use this skill
- Adding or modifying battle logic
- Changing state machines
- Introducing new features or flags
- Fixing bugs

## Testing principles
1. **No logic change without tests**
2. **Test behaviour, not implementation**
3. **State transitions must be explicit**
4. **Feature flags require on/off coverage**

## Required test types
- State transition tests
- Rule evaluation tests
- Feature flag toggle tests
- Smoke tests for entry wiring

## Expected output
- New or updated test files
- Clear test descriptions
- Coverage-aware suggestions when gaps exist