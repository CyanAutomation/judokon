# ADR: Classic Battle Module Refactor

## Status

Accepted

## Context

`src/helpers/classicBattle.js` had grown to include round management, stat
selection logic, and quit modal creation. Consolidating these responsibilities
into a single file made maintenance difficult and discouraged reuse.

## Decision

Split the original helper into dedicated modules:

- `roundManager.js` — handles round setup and timer coordination.
- `selectionHandler.js` — manages stat selection and evaluation.
- `quitModal.js` — encapsulates quit confirmation modal creation.
- `TimerController.js` — centralizes countdown timer logic for rounds and cooldowns.

A lightweight `classicBattle.js` file now re-exports these modules for backward
compatibility. Page code such as `classicBattlePage.js` imports the new modules
directly.

## Consequences

This refactor improves separation of concerns and paves the way for further UI
and logic isolation. Tests and consumers referencing `classicBattle.js` remain
functional, while new code can target the more granular modules.
