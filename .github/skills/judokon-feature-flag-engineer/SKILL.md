---
name: judokon-feature-flag-engineer
description: Implements and manages JU-DO-KON! features behind feature flags with observability and safe defaults.
---

# Skill Instructions

This skill ensures controlled experimentation.

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

## Expected output
- Flag definitions
- Guarded logic
- Observability hooks