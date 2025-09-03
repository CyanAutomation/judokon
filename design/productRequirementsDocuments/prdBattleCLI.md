# PRD: Classic Battle — CLI Mode

---

## TL;DR

A **terminal-style, text-first** presentation of Classic Battle that reuses the **same engine and state machine**. It renders prompts, timers, selections, outcomes, and scores using **monospace text** with **full keyboard support** (and optional pointer/touch). The mode targets **fast loads, low memory, high readability**, and **deterministic behavior** suited to both players and automated testing—**without** altering game rules.

---

## Problem Statement

The animated Classic Battle UI can be heavy for low-spec devices and noisy for power users or automated tests. We need a **lightweight, deterministic surface** that preserves gameplay logic and timers while maximizing **readability, accessibility, and observability**.

**Player Persona Examples:**

- **Low-spec user:** Laptop with 2GB RAM, needs fast loading and low memory usage.
- **Keyboard-only user:** Relies on shortcuts and navigation without mouse.
- **Screen-reader user:** Requires clear announcements and focus control.

**Tester Persona Examples:**

- **Automation pipeline:** CI/CD runs Playwright tests with deterministic seeds.
- **QA engineer:** Needs stable DOM hooks and observability for debugging.

**Direct Feedback Quotes:**

- _“It takes 5–10 seconds for the normal mode to load on my old laptop. Sometimes it freezes completely.”_ — Low-spec player
- _“I can’t use the mouse at all, so I need to finish a match using only the keyboard.”_ — Keyboard-only user
- _“We need stable selectors. If IDs change every release, our automated tests break.”_ — QA engineer

**Success looks like:**

- Opens fast, runs on modest hardware, and remains legible and navigable by keyboard alone.
- Mirrors core Classic Battle mechanics with **no rules divergence**.
- Offers stable **DOM/test hooks** and optional verbose logs for debugging.

---

## Goals

### Player Goals

1. **Speed & Simplicity:** CLI mode loads in ≤500 ms cold-interactive on mid-spec hardware.
2. **Keyboard-first:** 100% of playthrough actions are achievable with keyboard-only input.
3. **Discoverable Controls:** All shortcuts are listed inline on-screen; help panel accessible in ≤1s with `H`.
4. **Parity:** Same rounds, timers, outcomes, and win conditions as Classic Battle.
5. **Accessibility:** Passes WCAG 2.1 AA; screen readers announce all prompts/outcomes correctly in >95% of test cases.
6. **Touch-Friendly:** Tap/click targets are **≥44px** tall to meet WCAG touch guidance for children’s dexterity.

### Dev/Test Goals

1. **Determinism:** Matches replayed with the same seed and flags produce identical outcomes.
2. **Stable Hooks:** Test selectors (`#cli-root`, `#cli-countdown`, etc.) are never renamed post-release.
3. **Observability:** Verbose log mode shows state transitions and inputs with timestamps in real-time.
4. **Tiny Footprint:** CLI mode JS bundle <50KB; memory footprint <30MB during steady-state play.

---

## Non-Goals

- Rich card art, animations, or image-heavy layouts.
- Alternate rules, power-ups, or balancing changes.
- Tooltip content parity with the visual mode (CLI favors inline hints).
- Multiplayer or networked features beyond existing engine expectations.

---

## User Stories

- As a player on a low-spec device, I want a mode that **loads fast** and is **easy to read**.
- As a keyboard-only user, I want to **select stats** and **advance rounds** without the mouse.
- As a screen-reader user, I want **clear announcements** for prompts, timers, and outcomes.
- As a tester, I want **stable selectors** and **deterministic runs** to automate end-to-end checks.
- As a returning player, I want to **jump in quickly** and finish a short session.
- As a player, I want the ability to **cancel or change my stat selection** before the timer expires, so I don’t get locked into a mistake.

---

## Functional Requirements (Prioritized)

| Prio   | Feature                 | Requirement                                                                                                                                                                  |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | **Engine Parity**       | Reuse the Classic Battle engine/state table verbatim; no logic forks.                                                                                                        |
| **P1** | **Text Renderer**       | Render prompts, countdown, stat list (with numeric hotkeys), outcome, and score in a monospace pane. No images/animations.                                                   |
| **P1** | **Keyboard Controls**   | `1–5` select stat; `Enter`/`Space` advance; `H` help; `Q` quit/confirm; `Esc` close dialogs; keys are debounced per state. Stat selection can be overwritten before timeout. |
| **P1** | **Pointer/Touch**       | Click/tap on stat rows to select (≥44px tall targets); a visible **Next** control appears post-round.                                                                        |
| **P1** | **Timer Display**       | 1 Hz textual countdown for selection window; expiry behavior mirrors engine (see Feature Flags).                                                                             |
| **P1** | **Outcome & Score**     | Print Win/Loss/Draw and show both compared values; update score immediately.                                                                                                 |
| **P1** | **Accessibility Hooks** | Announce prompts/timers/outcomes via `aria-live="polite"` / `role="status"`, logical focus order, visible focus ring.                                                        |
| **P1** | **Test Hooks**          | Provide stable selectors: `#cli-root`, `#cli-header`, `#cli-countdown`, `#cli-stats`, `#round-message`, `#cli-score`; expose `data-round`, `data-remaining-time`.            |
| **P2** | **Settings (Minimal)**  | Win target selector (5/10/15). Changing value offers to reset match; persist choice locally via `localStorage`. Invalid values reset to defaults.                            |
| **P2** | **Deterministic Seed**  | Input and `?seed=` param; store last seed; seed drives PRNG used by engine/selection tie-breakers. Invalid seeds revert to default.                                          |
| **P2** | **Round Context**       | Header shows “Round X” and win target; optional state badge mirrors engine state.                                                                                            |
| **P2** | **Observability Mode**  | Feature-flagged verbose log view echoing state transitions and key events.                                                                                                   |
| **P2** | **Interrupt Handling**  | Quit confirmation pauses timers; cancel resumes; confirm ends/rolls back per engine rules.                                                                                   |

### Feature Flags (Configurable)

- `cliVerbose` — show verbose log panel. Default: off.
- `cliShortcuts` — enable single-key shortcuts (`H`, `Q`, digits, `Enter`, `Space`). Default: on.
- `battleStateBadge` — header badge reflecting engine state. Default: off.
- `autoSelect` — on timeout, auto-pick a valid stat (engine-consistent). Default: on.
- `skipRoundCooldown` — skip inter-round countdown. Default: off. Also via `?skipRoundCooldown=1`.

---

## UX Specification

### Layout (single column, desktop & mobile)

+––––––––––––––––––––––––––+
| Classic Battle — CLI Round 2 Target: 5 |
| [State: waitingForPlayerAction] [Score: 1–1] |
+––––––––––––––––––––––––––+

[Timer: 07]  
Choose a stat:  
(1) Power ………. 8  
(2) Speed ………. 7  
(3) Technique …… 9  
(4) Kumi-kata …… 6  
(5) Ne-waza …….. 7

Last round: You WON (Technique 9 vs 7)  
Match Outcome: You WON (9 vs 7)

Shortcuts: [1–5] Select [Enter]/[Space] Next [H] Help [Q] Quit [Esc] Back

**Sections**

- **Header:** mode title, round context, **optional** state badge, score.
- **Prompt Area:** timer + instruction.
- **Stat List:** numbered rows; whole row is focusable/clickable; shows value; each row ≥44px tall for tap targets.
- **Round Message:** outcome and compared values.
- **Shortcuts/Help:** inline hints; help panel toggled with `H` and closed with `Esc`.
- **Settings (collapsible):** win target, seed, verbose toggle (remembered).

**Focus & Navigation**

- On stat selection phase: focus moves to the **stat list container**; arrow keys cycle rows; `1–9` selects.
- Opening Help/Settings moves focus inside; closing restores prior focus.

**Styling**

- Monospace font; ≥4.5:1 contrast; visible focus ring; minimal CSS only.
- Optional “retro” look is acceptable if contrast/accessibility are preserved.

**DOM & Test Hooks**

- Containers: `#cli-root`, `#cli-header`, `#cli-countdown`, `#cli-stats`, `#round-message`, `#cli-score`, `#cli-shortcuts`, `#cli-settings`.
- Data: `#cli-root[data-round="N"]`, `#cli-countdown[data-remaining-time="S"]`.
- Primary action: `#next-round-button` (render only when available).

Additional test-contract details and page-level helpers

- The page exposes a small test helper under `window.__battleCLIinit` to keep end-to-end tests deterministic and small. Available helpers include:
  - `setCountdown(seconds)` — atomically updates `#cli-countdown[data-remaining-time]` and the visible countdown text.
  - `renderSkeletonStats(count)` / `clearSkeletonStats()` — manage skeleton stat placeholders used to avoid layout shifts in visual tests.
  - `focusStats()` / `focusNextHint()` — programmatic focus helpers for keyboard flows.
  - `applyRetroTheme(enabled)` — toggles the retro theme, persisted in localStorage.
  - `setSettingsCollapsed(collapsed)` — programmatically collapse/expand the settings panel; persisted in `localStorage` as `battleCLI.settingsCollapsed`.
  - Examples used by tests:
    - `await page.evaluate(() => window.__battleCLIinit.setCountdown(3));`
    - `await page.evaluate(() => window.__battleCLIinit.setSettingsCollapsed(true));`

  These helpers are intentionally small and synchronous to keep tests deterministic.

---

## Accessibility Requirements

- Announce prompt/changes via `aria-live="polite"` and/or `role="status"`.
- Logical tab order; trap focus inside modals/help; ESC closes overlays.
- Visible focus indicators; supports 200% zoom without loss of function.
- All interactive elements have names/roles/states exposed.
- Avoid time-based content that cannot be paused except where game rules require it; provide `skipRoundCooldown` flag.
- Tap/click targets ≥44px tall.

---

## Observability & Telemetry

- Optional verbose pane (flagged) listing **timestamped** state transitions, inputs, and timer ticks.
- Structured test hooks (data-attrs) to read **current round** and **remaining time**.
- All console noise routed via a logger that can be silenced in CI.

---

## Error & Edge-Case Handling

- **Invalid Keys:** ignore, optionally show small hint: “Press H for help.”
- **Rapid Multi-Input:** first input per state wins; subsequent inputs ignored until next state.
- **Tab Hidden / Sleep:** timers pause on `visibilitychange`/`pagehide` and resume on return; no double-fires.
- **Unexpected Error:** show readable message and roll back to last safe state per engine contract.
- **Quit During Countdown:** quit confirmation pauses timer; cancel resumes countdown; confirm exits per rules.
- **A11y Fallback:** if announcements fail, visible text always reflects the latest state.

---

## Acceptance Criteria (BDD-style)

### Engine Parity

- **Given** any state transition, **when** it occurs, **then** the CLI’s derived UI reflects the new engine state exactly (same timers, outcomes, and end conditions).

### Keyboard

- **Given** stat selection, **when** the user presses `1–5` for a visible stat, **then** that stat is selected once and input is debounced until next state.
- **Given** round resolved, **when** `Enter` or `Space` is pressed, **then** next phase begins (or next round if in cooldown).
- **Given** active match, **when** `Q` is pressed, **then** a quit confirmation appears; **confirm** ends/rolls back per rules; **cancel** or `Esc` resumes timers.
- **Given** help is hidden, **when** `H` is pressed, **then** help opens and is closable via `H`, `Esc`, or Close.

### Timer

- **Given** `waitingForPlayerAction`, **when** each second passes, **then** `#cli-countdown` updates text and `data-remaining-time`.
- **Given** countdown expires and `autoSelect` is **on**, **when** time reaches 0, **then** a valid stat is auto-selected before decision.
- **Given** inter-round cooldown, **when** `skipRoundCooldown` is **on**, **then** the next round begins immediately without showing countdown.

### Outcome & Score

- **Given** `roundDecision`, **when** resolved, **then** `#round-message` prints Win/Loss/Draw and compared values.
- **Given** score changes, **then** `#cli-score` updates synchronously.
- **Given** win target met, **then** a “Play again” option or lobby return is shown.

### Accessibility

- **Given** any prompt/outcome change, **then** screen readers announce it (`aria-live`).
- **Given** keyboard navigation, **then** focus is always visible and logical.
- **Given** 200% zoom, **then** all functions remain available without horizontal scroll on common widths.
- **Given** a touch device, **then** tap targets are at least 44px tall.

### Determinism

- **Given** a `seed` via input or query, **when** the match is replayed with the same seed and flags, **then** PRNG-dependent behavior is identical.
- **Given** an invalid seed (non-numeric), **then** a clear error message is shown and the match falls back to default PRNG.

### Error Handling

- **Given** an unexpected error, **when** it occurs, **then** a readable message is shown and the game rolls back to the last safe engine state.

---

## Dependencies

- Classic Battle engine and state table (single source of truth).
- Settings storage helper (for points-to-win, flags, seed).
- Logger utility capable of CI silencing.

 

---

## Open Questions

1. Should the CLI **mirror the snackbar surface** from the visual mode, or standardize on a single countdown/message area?
2. Do we show **per-stat tooltips** as inline text hints, or keep the list strictly minimal?
3. Minimum **stat list length** and ordering rules for consistent hotkeys (e.g., always map top N stats to `1…N`)?

---

## Glossary

- **Engine Parity:** No rules or timing deviations from Classic Battle.
- **Determinism:** Seeded PRNG leads to reproducible sequences under identical flags.
- **Hot-path:** Code segments executed frequently during selection/decision/render; must avoid dynamic imports.

---

## Tasks

- [ ] 1.0 Engine Integration
  - [ ] 1.1 Import and reuse Classic Battle engine/state machine without modification
  - [ ] 1.2 Ensure CLI surface reflects all engine transitions
  - [ ] 1.3 Validate no rule or timing divergence from UI mode

- [ ] 2.0 CLI Renderer
  - [ ] 2.1 Implement monospace text renderer for prompts, stats, timers, outcomes
  - [ ] 2.2 Add 1 Hz countdown display with data attributes
  - [ ] 2.3 Render score updates and round messages immediately
  - [ ] 2.4 Ensure stat rows meet 44px touch target minimum

- [ ] 3.0 Input & Controls
  - [ ] 3.1 Implement keyboard controls: digits for stats, Enter/Space for next, H for help, Q for quit
  - [ ] 3.2 Add pointer/touch support for stat rows
  - [ ] 3.3 Implement debounce logic to prevent rapid multi-input
  - [ ] 3.4 Implement quit confirmation cancel/resume flow

- [ ] 4.0 Accessibility & Hooks
  - [ ] 4.1 Add aria-live and role=status announcements
  - [ ] 4.2 Implement logical tab order and visible focus indicators
  - [ ] 4.3 Add stable selectors and data attributes for testing
  - [ ] 4.4 Trap focus inside help/settings modals and close with ESC

- [ ] 5.0 Settings & Observability
  - [ ] 5.1 Implement win target selector with localStorage persistence
  - [ ] 5.2 Add seed input and query param handling (invalid values revert to default)
  - [ ] 5.3 Implement optional verbose log panel (feature-flagged)
  - [ ] 5.4 Add header state badge (optional via flag)

- [ ] 6.0 Error Handling & Edge Cases
  - [ ] 6.1 Handle invalid input keys gracefully with hint
  - [ ] 6.2 Pause/resume timers on `visibilitychange`
  - [ ] 6.3 Roll back to last safe state on unexpected error
  - [ ] 6.4 Auto-select stat on timeout if `autoSelect=on`
