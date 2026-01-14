---
name: judokon-architecture-guardian
description: Enforces JU-DO-KON! architectural boundaries, module responsibilities, and design intent. Use when designing, refactoring, or reviewing core game logic.
---

# Skill Instructions

This skill ensures that all changes respect the established JU-DO-KON! architecture.

## What this skill helps accomplish
- Prevent architectural drift
- Maintain separation of concerns
- Preserve the Battle Engine mental model
- Ensure UI, engine, and data layers remain decoupled

## When to use this skill
- Adding new game modes
- Refactoring battle logic
- Modifying state machines
- Reviewing AI-generated code for correctness

## Core architectural rules (must follow)
1. **Battle Engine owns rules and outcomes**
   - No game rules in UI components
   - No DOM access inside engine logic
2. **UI is reactive, not authoritative**
   - UI reads state, never mutates it directly
3. **JSON is the source of truth**
   - Battle states, judoka data, and configuration live in JSON
4. **Facades define boundaries**
   - External callers interact through facades, not internals
5. **Feature flags gate behaviour**
   - Experimental logic must be flag-protected

## Anti-patterns (must avoid)
- Business logic inside rendering functions
- Implicit coupling between UI and engine internals
- Duplicated rule definitions across files

## Expected output
- Clear explanation of where changes belong
- Suggested module placement
- Warnings when boundaries are crossed