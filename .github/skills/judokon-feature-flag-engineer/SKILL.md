---
name: judokon-feature-flag-engineer
description: Implements and manages JU-DO-KON! features behind feature flags with observability and safe defaults.
---

# Skill Instructions

This skill ensures controlled experimentation.

## Inputs / Outputs / Non-goals

- Inputs: feature requirements, settings defaults, UI + engine touchpoints.
- Outputs: flag definitions, guarded logic, observability notes, test updates.
- Non-goals: shipping unflagged behavior or changing public APIs silently.

## What this skill helps accomplish

- Safe rollout of new functionality
- Reversible changes
- Debuggable behaviour

## When to use this skill

- Introducing new gameplay features
- Running experiments or trials
- Refactoring risky logic

## Feature flag rules

1. **New features default to OFF**
2. **Flags must be declared centrally**
3. **UI and engine must respect flags**
4. **Expose state via data-* attributes**

## File anchors

- Flag defaults: `src/config/settingsDefaults.js`
- Settings UI: `src/pages/settings.html`

## Rollout checklist

- Flag declared with default OFF and documented usage.
- Guard added in both UI and engine touchpoints.
- On/off coverage in tests where behavior changes.
- Observability via `data-*` attribute or equivalent.

## Expected output

- Flag definitions
- Guarded logic
- Observability hooks
