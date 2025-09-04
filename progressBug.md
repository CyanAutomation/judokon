# Bug: Playwright next-round readiness test times out

- Affected test: `playwright/battle-next-readiness.spec.js`
- Symptom: Test times out waiting for `nextRoundTimerReady` after a round resolves.
- Scope: Classic Battle inter-round cooldown/readiness signaling.

## Summary

The test listens on `window` for `nextRoundTimerReady`, but the app emits this event on the Classic Battle event bus (`globalThis.__classicBattleEventTarget`) via `emitBattleEvent(...)`. As a result, the page-level listener never receives the event and the test times out, even though the cooldown flow completes.

## Failure Details (from logs)

- Orchestrator enters cooldown and initial match-start cooldown runs:
  - `cooldownEnter called with payload: {initial: true}`
  - `handleCountdownExpired called`
- Round selection and resolution proceed:
  - `INFO: statSelected event handler`
  - `roundResolved event received`
- Inter-round cooldown scheduling observed:
  - `cooldownEnter called with payload: undefined`
  - `initInterRoundCooldown called`
  - `startCooldown ... state=cooldown`
- Test waits here and times out waiting for `nextRoundTimerReady` via `window.addEventListener`.

Note: The app emits `nextRoundTimerReady` on the shared EventTarget, not on `window`.

## Likely Root Cause

- Mismatch between where the test attaches the listener and where the app emits the event:
  - Emission sites:
    - `src/helpers/classicBattle/orchestratorHandlers.js` (inter-round path)
    - `src/helpers/classicBattle/roundManager.js` (fallback/legacy path)
  - Both call `emitBattleEvent("nextRoundTimerReady")` → dispatches on `globalThis.__classicBattleEventTarget`.
  - The failing spec attaches to `window.addEventListener("nextRoundTimerReady", ...)` which never fires.

## Changes made (diagnostic logging only)

Added info-level logs to surface countdown and readiness lifecycle:

- `src/helpers/classicBattle/orchestratorHandlers.js`
  - Log on `cooldownEnter` with payload.
  - Log in `initInterRoundCooldown` and just before emitting `nextRoundTimerReady`.
- `src/helpers/classicBattle/uiService.js`
  - Log when countdown starts, skip path is taken, when the timer starts, and when it expires.
  - Log when `handleCountdownExpired` runs.
- `src/helpers/classicBattle/roundManager.js`
  - Log when the next-round timer expires and when `resolveReady` emits `nextRoundTimerReady`.

These logs should appear in Playwright output to confirm the emission path and timing.

## Suggested Fixes

1. Update the spec to listen on the Classic Battle event bus (preferred):

- Replace the direct window listener with the existing helper:
  - Use `await waitForNextRoundReadyEvent(page);` (already defined in `playwright/fixtures/waits.js`).
- Rationale: This attaches to `globalThis.__classicBattleEventTarget` within the page and mirrors app behavior.

2. Alternative (not preferred): Also dispatch a DOM/window event for `nextRoundTimerReady`.

- Would add a `window.dispatchEvent(new Event("nextRoundTimerReady"))` alongside the bus emit.
- Downsides: Two event channels to maintain; test coupling to window events.

## Repro Steps

- Run: `npx playwright test playwright/battle-next-readiness.spec.js`
- Observe timeout at the line awaiting `nextRoundTimerReady` via `page.evaluate(() => window.addEventListener(...))`.

## Validation Plan (after applying Fix #1)

- Replace the in-spec wait with `waitForNextRoundReadyEvent(page)`.
- Re-run the spec and confirm it passes.
- Verify logs show the lifecycle: orchestrator cooldown start → countdown expired → `nextRoundTimerReady` emitted.

## Notes / Risks

- Logging uses `console.info` only to avoid the repository rule about unsuppressed `console.warn/error` in tests.
- No public API behavior changed; imports and hot-paths unaffected.
- If tests rely on window events elsewhere, audit them to ensure they use bus-based waits.

## File Pointers

- Event bus: `src/helpers/classicBattle/battleEvents.js`
- Emissions:
  - `src/helpers/classicBattle/orchestratorHandlers.js` (`initInterRoundCooldown`) → emits `nextRoundTimerReady`.
  - `src/helpers/classicBattle/roundManager.js` (`createNextRoundControls` and expiration path) → emits `nextRoundTimerReady`.
- Renderer starting countdown: `src/helpers/CooldownRenderer.js` (emits `nextRoundCountdownStarted` and ticks).
- Playwright wait helper: `playwright/fixtures/waits.js` (`waitForNextRoundReadyEvent`).

## Open Questions

- Do we want a DOM-level mirror event for accessibility toolchains? If yes, standardize and document it; otherwise keep tests aligned with the event bus.

## Investigation Log

### 2025-09-04

- **Action**: Ran `npx playwright test playwright/battle-next-readiness.spec.js`.
- **Result**: Test failed with a timeout, as described in the bug report. The `waitForNextRoundReadyEvent` function timed out.
- **Analysis**: The timeout indicates that the `nextRoundTimerReady` event is not being fired on the custom event bus as expected.

- **Action**: Investigated the code to trace the cooldown logic.
- **Analysis**: A race condition was identified. The `roundResolved` event handler in `src/helpers/classicBattle/roundUI.js` was calling `startCooldown()` from `roundManager.js`, while the state machine's `cooldownEnter` handler was calling `initInterRoundCooldown()` from `orchestratorHandlers.js`. The `startCooldown` path does not emit the `nextRoundTimerReady` event, which is necessary for the test to pass. This race condition meant that the incorrect cooldown path was being taken.

- **Action**: Removed the calls to `startCooldown()` from the `roundResolved` event handlers in `src/helpers/classicBattle/roundUI.js` (in both `bindRoundUIEventHandlers` and `bindRoundUIEventHandlersDynamic`).
- **Analysis**: This change is intended to make the orchestrator's cooldown path the single source of truth, ensuring the `nextRoundTimerReady` event is always emitted.