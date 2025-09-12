# PRD: Classic Battle — CLI Mode

---

## TL;DR

A **terminal-style, text-first** presentation of Classic Battle that reuses the **same engine and state machine**.
It renders prompts, timers, selections, outcomes, and scores using **monospace text** with **full keyboard support** (and optional pointer/touch).
The mode targets **fast loads, low memory, high readability**, and **deterministic behavior** suited to both players and automated testing—**without altering game rules**.

Styling and layout embrace **terminal authenticity**: monospace font, visible focus, ASCII/Unicode separators, consistent rhythm, and professional typography hierarchy.

---

## Problem Statement

The animated Classic Battle UI can be heavy for low-spec devices and noisy for power users or automated tests.
We need a **lightweight, deterministic surface** that preserves gameplay logic and timers while maximizing **readability, accessibility, and observability**.

**Personas**

* **Low-spec user:** Needs fast loading and low memory usage.
* **Keyboard-only user:** Must finish a match without a mouse.
* **Screen-reader user:** Requires clear announcements and focus control.
* **Automation pipeline:** Needs deterministic, stable DOM hooks.
* **QA engineer:** Requires observability and reliable selectors.

**Success looks like:**

* Opens fast, runs on modest hardware, navigable by keyboard alone.
* Mirrors Classic Battle mechanics exactly.
* Provides stable test hooks and optional verbose logs.

---

## Goals

### Player Goals

1. Load in ≤500 ms cold-interactive on mid-spec hardware.
2. 100% keyboard-only playthrough.
3. Inline shortcuts, with help panel via `H` in ≤1s.
4. Full parity with Classic Battle (rounds, timers, outcomes, win conditions).
5. Pass WCAG 2.1 AA; >95% correct announcements.
6. Tap/click targets ≥44px tall.

### Dev/Test Goals

1. Determinism via seed replay.
2. Stable selectors (`#cli-root`, `#cli-countdown`, etc.).
3. Verbose log mode with timestamps.
4. JS bundle <50KB, memory footprint <30MB.
5. Terminal authenticity: design matches CLI conventions.
6. Typography consistency: monospace font, line-height 1.45, clear hierarchy.

---

## Non-Goals

* Rich card art, animations, or images.
* Alternate rules or power-ups.
* Tooltip parity with visual mode.
* Multiplayer/networked features.

---

## User Stories

* As a player on a low-spec device, I want a mode that loads fast and is easy to read.
* As a keyboard-only user, I want to select stats and advance rounds without the mouse.
* As a screen-reader user, I want clear announcements for prompts, timers, and outcomes.
* As a tester, I want stable selectors and deterministic runs for automation.
* As a returning player, I want to jump in quickly for a short session.
* As a player, I want to cancel or change stat selection before the timer expires.

---

## Functional Requirements (Prioritized)

| Prio   | Feature             | Requirement                                                                                           |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------- |
| **P1** | Engine Parity       | Reuse Classic Battle engine/state table verbatim; no forks.                                           |
| **P1** | Text Renderer       | Render prompts, countdown, stat list (with numeric hotkeys), outcome, and score in monospace.         |
| **P1** | Keyboard Controls   | `1–5` stat select; `Enter`/`Space` next; `H` help; `Q` quit; `Esc` close; input debounced per state.  |
| **P1** | Pointer/Touch       | Stat rows clickable/tappable (≥44px); Next control after round.                                       |
| **P1** | Timer Display       | 1 Hz countdown; expiry behavior mirrors engine.                                                       |
| **P1** | Outcome & Score     | Show Win/Loss/Draw with compared values; update score immediately.                                    |
| **P1** | Accessibility Hooks | Announce via aria-live/role=status; logical focus order; visible focus ring.                          |
| **P1** | Test Hooks          | Stable selectors (`#cli-root`, `#cli-countdown`, `#cli-score`, etc.); data-round/data-remaining-time. |
| **P2** | Settings            | Win target selector; persist via localStorage; invalid resets.                                        |
| **P2** | Deterministic Seed  | Input/`?seed=` param; persist last seed; invalid fallback.                                            |
| **P2** | Round Context       | Header shows “Round X” and win target; optional state badge.                                          |
| **P2** | Observability Mode  | Verbose log view echoing transitions and events.                                                      |
| **P2** | Interrupt Handling  | Quit confirmation pauses timers; cancel resumes.                                                      |

**Feature Flags**

* `cliVerbose` — show log panel.
* `cliShortcuts` — enable single-key shortcuts.
* `battleStateBadge` — header badge reflecting state.
* `autoSelect` — auto-pick on timeout.
* `skipRoundCooldown` — bypass inter-round countdown.

---

## UX Specification

### Layout (single column, desktop & mobile)

```
┌─────────────────────────────────────────┐
│ bash — JU-DO-KON                        │
├─────────────────────────────────────────┤
│ Classic Battle — CLI │ Round 2 │ You: 1 │
│                      │  of 5   │ CPU: 1 │
├─────────────────────────────────────────┤
│ ⏱ Timer: 07s                            │
│ → Choose your stat:                     │
│   (1) Power ……………………… 8               │
│   (2) Speed ……………………… 7               │
│   (3) Technique ………………… 9               │
│   (4) Kumi-kata ……………… 6               │
│   (5) Ne-waza …………………… 7               │
│─────────────────────────────────────────│
│ → Last: You WON (Technique 9 vs 7)      │
│─────────────────────────────────────────│
│ [1-5] Select │ [↵/Space] Next │ [H] Help│
└─────────────────────────────────────────┘
```

**Enhancements**

* Gradient terminal title bar with authentic styling.
* Unicode indicators (⏱, →, │).
* Professional separators (`────────────────────`).
* Consistent 8px rhythm, line-height 1.45.
* Refined stat list styling, hover states, and alignment.
* Terminal-style control hints at footer with pipes.
* Timer warning color (#ffcc00) when near expiry.
* Status text contrast improved (#ffffff, #e0e0e0).
* Mobile: smaller text sizes, preserved 44px tap targets.

---

## Accessibility Requirements

* WCAG 2.1 AA compliance preserved and enhanced.
* Touch target ≥44px.
* Keyboard navigation unchanged.
* Screen reader announcements preserved.
* Logical tab order; ESC closes modals.
* Focus indicators visible and authentic to terminal style.

---

## Observability & Telemetry

* Verbose pane (flagged) listing timestamped transitions, inputs, and ticks.
* Structured test hooks (data-attrs for round/time).
* Console routed via logger, silenced in CI.

---

## Error & Edge Cases

* Invalid keys ignored; small hint “Press H for help.”
* Rapid multi-input debounced.
* Timers pause on tab hide; resume on return.
* Unexpected error: readable message, rollback to safe state.
* Quit confirmation pauses/resumes timers as expected.

---

## Acceptance Criteria (BDD-style)

(unchanged from original, covering Engine Parity, Keyboard, Timer, Outcome & Score, Accessibility, Determinism, Error Handling.)

---

## Dependencies

* Classic Battle engine/state table.
* Settings storage helper.
* Logger utility.

---

## Implementation Notes

* DOM/test selectors remain unchanged.
* Styling is additive, no functional regressions.
* CSS file `src/styles/cli-immersive.css` introduced for immersive styling.

---

## Testing & Verification

* Visual regression testing.
* Accessibility compliance (WCAG 2.1 AA).
* Touch target verification.
* Keyboard navigation flows.
* Screen reader compatibility.

---

## Future Considerations

1. Subtle terminal-style animations for state changes.
2. Optional terminal bell sounds for notifications.
3. Theme variations (amber/green CRT schemes).
4. Performance monitoring to ensure styling does not impact load.

---

## Tasks

- [ ] 1.0 Integrate CLI Mode with Classic Battle Engine
  - [ ] 1.1 Ensure engine and state machine reuse without forking.
  - [ ] 1.2 Validate logic parity through automated tests.

- [ ] 2.0 Build CLI Renderer
  - [ ] 2.1 Create monospace-rendered components for prompts, scores, outcomes.
  - [ ] 2.2 Implement layout and styling as per ASCII spec.
  - [ ] 2.3 Add responsive scaling for mobile/desktop.

- [ ] 3.0 Implement Input Handling
  - [ ] 3.1 Bind keyboard controls: 1–5, Enter, Space, H, Q, Esc.
  - [ ] 3.2 Enable pointer/touch interactivity with ≥44px targets.
  - [ ] 3.3 Debounce rapid multi-inputs.

- [ ] 4.0 Add Accessibility & Observability Hooks
  - [ ] 4.1 Implement `aria-live` regions and logical focus management.
  - [ ] 4.2 Insert stable test selectors and `data-*` attributes.
  - [ ] 4.3 Build verbose logger for test/debug mode.

- [ ] 5.0 Handle Settings, Errors, and Edge Cases
  - [ ] 5.1 Add seed-based determinism and localStorage persistence.
  - [ ] 5.2 Handle timer pause/resume on tab visibility change.
  - [ ] 5.3 Display helpful errors and fallback UIs.




