# QA Report: JU-DO-KON! Classic Battle (`battleClassic.html`)

**Review Date:** September 23, 2025

## 0. Verification Snapshot (2025-09-23)

| #  | Severity     | Status            | Evidence / Notes |
|----|--------------|-------------------|------------------|
| 1  | **Critical** | ✅ Resolved       | Match-length modal now always presents options and only highlights the saved choice (`src/helpers/classicBattle/roundSelectModal.js:489`). |
| 2  | **Critical** | ✅ Resolved       | Card pipeline draws player cards and renders an obscured opponent placeholder before reveal (`src/helpers/classicBattle/cardSelection.js:348`, `src/helpers/classicBattle/uiEventHandlers.js:24`). |
| 3  | **Critical** | ✅ Resolved       | Countdown uses scheduler ticks with manual and hard timeout fallbacks so the UI decrements each second (`src/helpers/timerUtils.js:116`). |
| 4  | **Critical** | ⚠️ Needs cleanup  | Scoreboard updates after each round, but the path still performs a dynamic import in the hot flow and preloads a bogus "You: 1" snapshot (`src/pages/battleClassic.init.js:387`, `src/pages/battleClassic.init.js:409`). |
| 5  | **High**     | ✅ Resolved       | Auto-select stanza triggers through `startTimer` once the countdown expires and flags opponent messaging (`src/helpers/classicBattle/timerService.js:875`). |
| 6  | **High**     | ✅ Resolved       | Round counter reconciles engine and DOM values, preventing double increments (`src/pages/battleClassic.init.js:841`). |
| 7  | **High**     | ✅ Resolved       | Replay reuses the engine-managed `startRound` path and zeroes UI state deterministically (`src/helpers/classicBattle/roundManager.js:132`). |
| 8  | **Medium**   | ✅ Resolved       | End-of-match modal now derives its copy from engine outcome and mirrors scoreboard totals (`src/helpers/classicBattle/endModal.js:1`). |
| 9  | **Medium**   | ✅ Resolved       | Footer navigation points to `battleClassic.html` (`src/pages/battleClassic.html:100`). |
| 10 | **Medium**   | ✅ Resolved       | `renderStatButtons` disables Next on entry and only re-enables after selection finalizes (`src/pages/battleClassic.init.js:951`). |
| 11 | **Medium**   | ✅ Resolved       | Modal helper traps focus and restores it on close, eliminating background focus leaks (`src/components/Modal.js:1`). |
| 12 | **Low**      | ✅ Resolved       | Scoreboard, timer, and stat controls expose `aria-live`/`aria-describedby` annotations (`src/pages/battleClassic.html:28`). |
| 13 | **Low**      | ✅ Resolved       | Match-length modal wires number and arrow key navigation across options (`src/helpers/classicBattle/roundSelectModal.js:200`). |
| 14 | **Low**      | ❌ Not started    | No UI wiring exists for difficulty selection; gameplay still assumes the default difficulty despite helper coverage (`src/pages/battleClassic.html`, `src/helpers/classicBattle/selectionHandler.js:27`). |
| 15 | **Low**      | ✅ Resolved       | Debug panel materializes when the test-mode flag is active and persists state across reloads (`src/helpers/classicBattle/debugPanel.js:351`). |
| 16 | **Low**      | ✅ Resolved       | Tooltip parsing normalizes `\n` sequences into `<br>` so match-length tooltips render correctly (`src/helpers/tooltip.js:111`). |

## 1. Executive Summary

Classic Battle’s core loop is now functional: rounds render correctly, timers progress, and replays respect engine state. Accessibility and messaging fixes landed as described. Two regressions require follow-up before the QA slate can close:
- The hot-path scoreboard updater still violates the dynamic-import policy and momentarily shows an incorrect "You: 1" snapshot when a round begins.
- The promised AI difficulty control (QA #14) remains unimplemented, leaving the gameplay feature incomplete.

## 2. Phase Notes

### Phase 1 – Round Entry Controls (Delivered)
- Confirmed `disableNextRoundButton()` runs whenever stat buttons render so players cannot advance prematurely (`src/pages/battleClassic.init.js:951`).
- Next is only re-enabled after `finalizeSelectionReady` executes the cooldown logic (`src/pages/battleClassic.init.js:520`).

### Phase 2 – Timer & Auto-Select Stabilization (Delivered)
- `createCountdownTimer` now attaches manual interval and hard timeout fallbacks, ensuring ticks fire even when RAF stalls (`src/helpers/timerUtils.js:142`).
- `startTimer` primes the scoreboard display and delegates expiration to `handleTimerExpiration`, triggering auto-select with opponent-delay signalling (`src/helpers/classicBattle/timerService.js:875`).

### Phase 3 – Card Rendering & Scoreboard Sync (Delivered with caveats)
- Replay path resets engine state and draws fresh cards through `handleReplay`, keeping scoreboard totals aligned (`src/helpers/classicBattle/roundManager.js:132`).
- Opponent reveal pipeline runs via `uiEventHandlers` so the placeholder persists until data arrives (`src/helpers/classicBattle/uiEventHandlers.js:24`).
- **Follow-up:** Replace the hot-path dynamic import and remove the temporary `You: 1` injection to avoid UI flicker and policy violations (`src/pages/battleClassic.init.js:387`, `src/pages/battleClassic.init.js:412`).

### Phase 4 – Match Length Modal Reliability (Delivered)
- Persisted selections now highlight the stored choice without bypassing the modal (`src/helpers/classicBattle/roundSelectModal.js:489`).
- Keyboard shortcuts are wired directly on the modal wrapper to match the UX promise (`src/helpers/classicBattle/roundSelectModal.js:200`).

### Phase 5 – Accessibility Enhancements (Delivered)
- Score, timer, and round announcements use polite live regions while opponent prompts record minimum dwell times (`src/pages/battleClassic.html:24`, `src/helpers/classicBattle/opponentPromptTracker.js:1`).
- Modal focus traps rely on the shared component, preventing background interaction leaks (`src/components/Modal.js:51`).

### Phase 6 – Match Outcome Messaging (Delivered)
- Outcome messaging is consistent across snackbar, scoreboard, and end modal using engine-sourced data (`src/helpers/classicBattle/endModal.js:20`).
- Tooltip formatting now replaces literal `\n` sequences with `<br>` (`src/helpers/tooltip.js:111`).

## 3. Outstanding Work

- **AI Difficulty selector (QA #14):** No UI element or settings hook exposes the existing difficulty logic; add the control to `battleClassic.html` and thread the selection into the engine startup.
- **Scoreboard hot-path hygiene:** Refactor the scoreboard updater to use the existing static import and remove the placeholder `You: 1` override before a round starts.

## 4. Opportunities for Improvement

- **Drop dynamic imports in hot paths:** `ensureScoreboardReflectsResult` and the replay reset block should reuse the static scoreboard/API imports already loaded at module scope (`src/pages/battleClassic.init.js:409`, `src/pages/battleClassic.init.js:1416`).
- **Remove fake scoreboard prefill:** The pre-selection branch that force-sets `You: 1` risks incorrect UI state when the player has zero wins; rely on live engine scores instead (`src/pages/battleClassic.init.js:387`).
- **Add coverage for scoreboard reconciliation:** Extend `tests/classicBattle/resolution.test.js` (or a new spec) to assert that scoreboard text transitions directly from the engine scores without interim artifacts when a round begins.
- **Surface difficulty selection in tests:** Once the UI lands, mirror it in the Vitest harness so `tests/helpers/classicBattle/difficulty.test.js` exercises the end-to-end flow rather than pure helper calls.

