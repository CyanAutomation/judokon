# PRD: Classic Battle CLI

---

**Game Mode ID:** `1-cli` (URL: battleCLI.html)  

**Supports / Shares Engine With:** [Classic Battle PRD](prdClassicBattle.md), [Classic Battle Engine PRD](prdClassicBattleEngine.md)

---

## TL;DR

Classic Battle CLI is a terminal-style, text-first presentation of the Classic Battle mode that reuses the existing Classic Battle engine and state machine. It renders rounds, timers, and outcomes using monospace text, ASCII accents, and keyboard input, targeting low-spec devices, power users, and automated testing. Visual animations are replaced with immediate textual updates and ARIA-live announcements while maintaining feature parity with the Classic Battle engine.

---

## Problem Statement

While **battleJudoka.html** provides a rich, animated UI, some users prefer a lightweight, distraction-free experience or run on constrained devices where animations and assets add overhead. Developers and testers also benefit from a deterministic, text-only surface to observe state transitions and outcomes without UI noise.  

- **Performance Baseline:** Must run on devices with ≤2 GB RAM, render initial screen within ≤500 ms, and keep memory footprint <30 MB.  
- **Observability:** Deterministic, text-only surface aids debugging and automated testing.  

A terminal-style Classic Battle ensures **fast load, consistent behavior, and improved observability** while preserving gameplay logic.

> “I just want the text and the numbers — quick, readable outcomes I can follow with the keyboard.”

---

## Goals

### Player-Facing Goals
- Deliver a **fast, text-first Classic Battle** that reuses the engine verbatim.  
- Provide **full keyboard control** with clear, discoverable shortcuts.  
- Support **mouse and touch input** so stats can be selected and rounds advanced without the keyboard.  
- Surface **state, timer, and outcomes instantly** via text and ARIA live regions.  
- Maintain **parity with Classic Battle mechanics, timers, and end conditions.**  

### Developer/Test Goals
- Enable robust **Playwright/Vitest automation** by exposing stable DOM hooks.  
- Keep **load footprint tiny**: no heavy assets, no CSS animations, minimal styles only.  
- Provide **observability mode** with verbose logs for debugging.  

---

## Non-Goals

- Rich card visuals, animations, or image-heavy layouts.  
- Alternative game rules or deviations from the Classic Battle engine.  
- New tooltip content; CLI favors inline text hints over hover tooltips.  

---

## User Stories

- As a player on a low-spec device, I want a lightweight mode that loads instantly and is easy to read.  
- As a keyboard-only user, I want to select stats and advance rounds without the mouse.  
- As a mouse or touch user, I want to click or tap to select stats and advance rounds.  
- As a screen-reader user, I want the current round message and timer to be announced clearly.  
- As a developer/tester, I want deterministic, textual feedback of state transitions for debugging.  
- As a returning player, I want to quickly play a few rounds without UI overhead.  

---

## Functional Requirements (Prioritized)

| Priority | Feature | Description |
|---|---|---|
| **P1** | Engine Integration | Use the same Classic Battle engine and state machine as battleJudoka; static import for core gameplay modules. |
| **P1** | Textual Renderer | Render all state changes (countdown, prompts, outcomes, score) as text within a monospace pane; no images/animations. |
| **P1** | Keyboard Controls | Shortcut keys for stat selection (1–9), Next/Continue (Enter/Space), Quit (Q), Help (H). Display a concise cheat sheet. |
| **P1** | Pointer Controls | Stats and Next prompts are clickable/tappable for mouse and touch users. |
| **P1** | Timer Display | Show a 1 Hz textual countdown for stat selection; on expiry, auto-select per `FF_AUTO_SELECT`. |
| **P1** | Outcome/Score | After decision, print outcome (Win/Loss/Draw), selected stat/value pairs, and updated score. |
| **P1** | Accessibility Hooks | Provide `aria-live="polite"` for round messages and countdown; maintain focus order for keyboard use. |
| **P1** | Test Hooks | Expose stable selectors/ids (e.g., `#round-message`, `#cli-score`, `#cli-countdown`, `data-flag`) to support existing tests and new CLI tests. |
| **P2** | Minimal Settings | Allow selecting win target (5/10/15) at start; persist last choice using existing settings helper. |
| **P2** | Observability Mode | Optional verbose logs (controlled by the `cliVerbose` feature flag) that echo internal state transitions. |
| **P2** | Interrupt Handling | Surface quit/interrupt flows as text prompts; roll back to last completed round consistent with engine PRD. |
| **P3** | Retro Mode | Optional ASCII borders and simple color accents via CSS classes; disabled by default for maximum contrast. |

### Feature Flags
- `cliVerbose` – toggles the verbose log section on the CLI page; disabled by default.
- `battleStateBadge` – shows a header badge reflecting the current match state; disabled by default.
- `autoSelect` – when enabled (default), the match auto-picks a random stat when the selection timer expires.
  When disabled, the CLI waits for manual input after timeout.
- `skipRoundCooldown` – when enabled, the CLI skips the inter-round countdown and immediately begins the next round.

`skipRoundCooldown` may also be enabled via the `?skipRoundCooldown=1` query parameter, which sets the feature flag at startup.

Notes:
- Core gameplay and timers must not use dynamic imports in hot paths. Optional features (e.g., Retro Mode) may be dynamically imported but preloaded during idle if enabled.  
- Maintain the scoreboard/snackbar surface contract where feasible: `#round-message` for outcomes and a dedicated area for countdown/prompts to keep tests consistent.  

---

## Acceptance Criteria

1. Engine Parity  
   - Given a match is running, when any state transition occurs, then the new state matches `src/helpers/classicBattle/stateTable.js` exactly.  

2. Keyboard Controls  
   - Given the player is in stat selection, when pressing keys 1–9 mapped to visible stats, then the corresponding stat is selected and input is debounced until the next state.  
   - Given a round has completed, when pressing Enter/Space, then the flow advances to cooldown/next round.  
   - Given an inter-round cooldown is running, when pressing Enter/Space, then the countdown is skipped and the next round begins immediately.  
   - Given an active match, when pressing Q, then a quit confirmation prompt appears; confirming ends or rolls back per engine rules.  

3. Timer Behavior  
  - Given `waitingForPlayerAction`, when the timer ticks, then `#cli-countdown` updates once per second with remaining time and exposes the value via `data-remaining-time`.
- Given timer expiry and `FF_AUTO_SELECT` enabled, when the countdown reaches zero, then a random stat is selected and printed before decision.
   - Given `cooldown`, when countdownStart fires, then a fallback timer runs and emits `countdownFinished` after the duration if not skipped.
   - Given `skipRoundCooldown` enabled, when `countdownStart` fires, then the next round begins immediately without showing countdown text.
   - Given the tab is hidden or device sleeps, when focus returns, then the timer resumes without double-firing and remains consistent with the engine PRD.  

4. Outcome and Score  
   - Given `roundDecision`, when the outcome resolves, then `#round-message` prints Win/Loss/Draw and both chosen stat values.  
   - Given `roundOver`, when scores update, then `#cli-score` reflects the new totals immediately.  

5. Accessibility  
   - Given any message update, when content changes, then `aria-live` announces the new round message or countdown text.  
   - Given keyboard-only navigation, when tabbing through controls, then focus order is logical and visible.  
   - All text meets ≥4.5:1 contrast and supports zoom to 200% without loss of functionality.  

6. Performance & Footprint  
   - Given a fresh load on average hardware, when opening `battleCLI.html`, then the page is interactive in ≤500 ms after network idle (no heavy assets).  
   - No runtime use of `await import()` on stat selection, round decision, event dispatch, or render loops.  

7. Testability  
   - Given the CLI page loads, when running Playwright/Vitest, then selectors `#round-message`, `#cli-countdown`, and `#cli-score` are present and update as the engine advances.  
   - Given verbose mode is enabled (`FF_CLI_VERBOSE`), when state transitions occur, then logs are emitted via a muted logger during tests (no unsilenced console.error/warn in CI).  

8. Interrupts  
   - Given an unexpected error, when the engine triggers rollback, then the UI prints an error message and returns to the last completed round/lobby per engine PRD.  

---

## Edge Cases / Failure States

- **Invalid Input:** When invalid keys (non 1–9, Q, H, Enter/Space) are pressed, ignore gracefully and display “Invalid key, press H for help.”  
- **Rapid Multi-Input:** If multiple inputs are fired before debounce, only the first is accepted; ignore the rest.  
- **Tab Hidden / Device Sleep:** Timers resume correctly on refocus, without double-firing.  
- **Unexpected Error:** Roll back to last safe state with clear error message, consistent with engine PRD.  
- **Accessibility Failure:** If ARIA announcements fail, ensure fallback with clear visible text updates.  

---

## UI and Interaction Model

### ASCII Wireframe (Desktop)

| Classic Battle CLI         Target: 5 Wins       |

| [Timer: 08]                                     |
| Choose a stat:                                  |
|   (1) Strength: 72                              |
|   (2) Agility: 63                               |
|   (3) Stamina: 81                               |

| Last Round: You WON! (72 vs 64)                 |
| Score: Player 2 - Opponent 1                    |

| Shortcuts: [1-9] Select | [Enter] Next | [Q] Quit |
|            [H] Help                             |

## UI and Interaction Model

- Layout: A single-column, monospace pane with sections: Header (mode title + win target), Countdown/Prompt area, Stat List with numeric hotkeys, Round Message, Score line, Shortcut cheat sheet.
- DOM hooks: `#cli-root`, `#cli-header`, `#cli-countdown` (snackbar equivalent), `#cli-stats`, `#round-message`, `#cli-score`, `#cli-shortcuts`.
- Keyboard map: 1–9 for stat selection; Enter/Space for Next; Q for Quit; H for Help/shortcuts.
- Focus: Initial focus on the stat list container during selection; after outcome, focus moves to Next instruction hint.
- Styling: Minimal CSS for spacing and contrast; optional ASCII borders when Retro Mode is on.

---

## Technical Considerations

- Module Loading Policy: Static import for engine/orchestrator/state table; optional CLI-only features may be dynamically imported and preloaded during idle.  
- Reuse hooks: Keep `#round-message` and a countdown/prompt surface matching Classic Battle test expectations to minimize new test code.  
- Accessibility: Use `role="status"`/`aria-live="polite"` for prompts and outcomes; ensure semantic headings and landmarks.  
- Data and settings: Use existing settings defaults for win target; persist locally via the shared helper.  
- Logging: Route verbose/diagnostic output through a muted logger helper in tests to keep CI clean.  

---

## Dependencies

- Classic Battle Engine: `src/helpers/classicBattle/stateTable.js`, `src/helpers/BattleEngine.js`, `src/helpers/classicBattle/orchestrator.js`  
- Settings defaults: `src/config/settingsDefaults.js`  
- Snackbar helper (optional text surface alignment): `src/helpers/showSnackbar.js`  
- Testing helpers: `tests/helpers/initClassicBattleTest.js` and event-promises (round prompt/countdown/resolution)  

---

## Open Questions

- Should the CLI mirror snackbar semantics exactly or consolidate to a single `#cli-countdown` area? If consolidated, update tests accordingly.  
- Do we expose a “seed” input to make deterministic runs selectable from the UI, or keep seed-only via dev tools?  
- Is Retro Mode desired by default on desktop, or opt-in only?  

---

## Tasks

- [ ] 1.0 Scaffold CLI page
  - [ ] 1.1 Create `battleCLI.html` with required DOM hooks (`#cli-root`, `#cli-header`, etc.)
  - [ ] 1.2 Add minimal CSS for monospace, spacing, and high contrast
  - [ ] 1.3 Add fallback layout for narrow/mobile screens
- [ ] 2.0 Integrate engine
  - [ ] 2.1 Import engine/orchestrator/state table statically
  - [ ] 2.2 Bind engine events to renderer (countdown, outcomes, score)
  - [ ] 2.3 Ensure rollback/error handling routes UI back to last safe state
- [ ] 3.0 Input & timer
  - [ ] 3.1 Implement keyboard mapping (1–9, Enter/Space, Q, H)
  - [ ] 3.2 Implement mouse/touch stat selection
  - [ ] 3.3 Render 1 Hz countdown; handle auto-select on expiry
  - [ ] 3.4 Add input validation for invalid keys and multi-key conflict handling
- [ ] 4.0 Accessibility & observability
  - [ ] 4.1 Add `aria-live` and role attributes
  - [ ] 4.2 Ensure ≥4.5:1 contrast and zoom to 200% without breaking layout
  - [ ] 4.3 Add stable IDs (`#round-message`, `#cli-score`, etc.) and `data-flag` hooks
  - [ ] 4.4 Verify focus order and accessibility fallbacks
- [ ] 5.0 Testing
  - [ ] 5.1 Add Playwright specs for keyboard/mouse/timer
  - [ ] 5.2 Verify selectors remain stable
  - [ ] 5.3 Add automated tests for error/rollback handling
  - [ ] 5.4 Ensure logs are muted in CI with verbose mode enabled

---

**See also:**
- [Classic Battle PRD](prdClassicBattle.md)
- [Classic Battle Engine PRD](prdClassicBattleEngine.md)
- [Battle Scoreboard PRD](prdBattleScoreboard.md)
- [PRD Guidelines for Agents](../codeStandards/prdRulesForAgents.md)
