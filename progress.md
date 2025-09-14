# Battle Engine Analysis & Improvement Plan

## 1. Executive Summary

My review of the Battle Engine PRD and its implementation reveals a significant divergence from the intended architecture. The core problem is the absence of the **Orchestrator** layer described in the PRD. The current system delegates the responsibility of managing the game's state machine (FSM) to the UI layer (`classicBattle.js`), while the `battleEngineFacade.js` acts as a simple, stateless pass-through to a monolithic `BattleEngine.js`.

This inverts the specified design, leading to high complexity in the UI, a confusing event model, and a high risk of race conditions. The user's concern about the system being "overly complicated" is well-founded.

This document outlines these issues and proposes a refactoring plan to align the implementation with the PRD, simplifying the UI and creating a more robust, predictable, and testable battle system.

## 2. Core Architectural Issue: Missing Orchestrator

The PRD specifies a clean, two-layer architecture:
- **Orchestrator:** A stateful component that owns the FSM, manages game flow (cooldowns, readiness), and emits authoritative `control.*` events for the UI.
- **Engine Core:** A mostly-stateless calculator for round outcomes and timers, acting on commands from the Orchestrator.

The current implementation fails to realize this separation:
- **`battleEngineFacade.js` is not an orchestrator.** It holds no state and simply forwards calls to a singleton `BattleEngine` instance.
- **`BattleEngine.js` is a monolith.** It incorrectly manages long-term match state (`matchEnded`, `roundsPlayed`) alongside its core calculation duties.
- **The UI (`classicBattle.js` and its sub-modules) has become the de-facto orchestrator.** It contains the FSM logic, manually calling engine methods like `startRound`, `handleStatSelection`, and `startCoolDown` to drive the game forward. This is the exact pattern the PRD was designed to prevent.

## 3. Specific Problems & Opportunities for Improvement

### 3.1. State Management Complexity
- **Problem:** Match state is split incorrectly. The `BattleEngine` holds state like `playerScore` and `matchEnded`, but the FSM logic that depends on this state is in the UI. This forces the UI to constantly query the engine (`isMatchEnded()`, `getScores()`) to make decisions, creating tight coupling and tangled logic.
- **Opportunity:** Relocate all authoritative match state (FSM state, `roundIndex`, `scores`) to a new, stateful **`BattleOrchestrator.js`**. The `BattleEngine` should be simplified to a "pure" calculator that receives state and returns a result, without retaining long-term match context.

### 3.2. Confusing and Incomplete Event Model
- **Problem:** The `BattleEngine` emits its own set of coarse-grained events (`roundEnded`, `matchEnded`) that do not match the rich, canonical event catalog in the PRD (`round.evaluated`, `match.concluded`, `control.state.changed`). The UI is forced to infer state transitions from these inadequate events, a practice the PRD explicitly forbids.
- **Opportunity:** Implement the full event catalog from the PRD.
    - The **`BattleEngine` (Core)** should emit "Domain" and "Timer" events (e.g., `round.evaluated`, `round.timer.expired`).
    - The new **`BattleOrchestrator`** will consume these events and produce the authoritative "Control" events (e.g., `control.state.changed`) for the UI. This provides a single source of truth for all view transitions.

### 3.3. High Risk of Race Conditions
- **Problem:** The PRD correctly identifies the potential race condition between a user's selection (`lockSelection`) and the round timer expiring (`round.timer.expired`). In the current code, this critical logic is handled in the UI layer, making it fragile and susceptible to bugs (e.g., processing a selection after the timer has already auto-selected).
- **Opportunity:** This race condition must be resolved within the **`BattleOrchestrator`**. When in the `selection` state, the orchestrator will listen for both a user selection event and a timer expiration event. Whichever event arrives first triggers the transition to the `evaluation` state, and the orchestrator will definitively ignore the second event. This centralizes and hardens the logic.

## 4. Proposed Refactoring Plan

To address these issues, I propose a refactoring effort to align the code with the PRD's architecture.

1.  **Create `BattleOrchestrator.js`:**
    - Transform the existing `battleEngineFacade.js` into a new, stateful `BattleOrchestrator.js`.
    - Implement the FSM from the PRD within this module. It will be the single source of truth for the match state.
    - It will expose a simple, high-level API to the UI, such as `startMatch()` and `lockSelection()`.

2.  **Refactor `BattleEngine.js` into a "Core" Engine:**
    - Simplify the `BattleEngine` to be a more stateless calculator. It will no longer manage `matchEnded` or `roundsPlayed`.
    - Its methods will be called by the `BattleOrchestrator`.
    - Update its event emissions to match the "Domain" and "Timer" events in the PRD's catalog.

3.  **Simplify the UI Layer (`classicBattle.js`):**
    - Remove all FSM and orchestration logic from the UI code.
    - The UI will subscribe to `control.state.changed` and other `control.*` events from the `BattleOrchestrator`.
    - Views will update declaratively based on the state provided by the orchestrator, without making any decisions about the game flow.

This refactoring will result in a system that is simpler, more robust, and easier to test, debug, and extend, fulfilling the original goals of the PRD.
