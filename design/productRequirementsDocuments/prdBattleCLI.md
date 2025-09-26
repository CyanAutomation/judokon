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

### Personas

- **Low-spec user:** Needs fast loading and low memory usage.
- **Keyboard-only user:** Must finish a match without a mouse.
- **Screen-reader user:** Requires clear announcements and focus control.
- **Automation pipeline:** Needs deterministic, stable DOM hooks.
- **QA engineer:** Requires observability and reliable selectors.

### Success looks like

- Opens fast, runs on modest hardware, navigable by keyboard alone.
- Mirrors Classic Battle mechanics exactly.
- Provides stable test hooks and optional verbose logs.

---

## Goals

### Player Goals

1. Load in ≤500 ms cold-interactive on mid-spec hardware.
2. 100% keyboard-only playthrough.
3. Inline shortcuts, with help panel via `H` in ≤1s.
4. Full parity with Classic Battle (rounds, timers, outcomes, win conditions).
5. Pass WCAG 2.1 AA; >95% correct announcements.
6. Tap/click targets ≥44px tall.
7. **Terminal Authenticity**: Design matches CLI conventions with enhanced visual elements.

Note: The CLI surface intentionally avoids displaying emoji in its runtime UI; visual indicators should use ASCII or simple Unicode alternatives to preserve terminal authenticity, readability, and deterministic test output. 8. **Typography Excellence**: Monospace font with improved line-height (1.45) and consistent 8px rhythm.

### Dev/Test Goals

1. Determinism via seed replay.
2. Stable selectors (`#cli-root`, `#cli-countdown`, etc.).
3. Verbose log mode with timestamps.
4. JS bundle <50KB, memory footprint <30MB.
5. **Enhanced Terminal Styling**: Professional terminal aesthetics with gradient title bar and Unicode indicators.
6. **Visual Hierarchy**: Refined font weights, spacing, and contrast ratios (7:1+ for primary text).
7. **Improved Accessibility**: Enhanced contrast and focus states while maintaining terminal feel.

---

## Non-Goals

- Rich card art, animations, or images.
- Alternate rules or power-ups.
- Tooltip parity with visual mode.
- Multiplayer/networked features.

---

## User Stories

- As a player on a low-spec device, I want a mode that loads fast and is easy to read.
- As a keyboard-only user, I want to select stats and advance rounds without the mouse.
- As a screen-reader user, I want clear announcements for prompts, timers, and outcomes.
- As a tester, I want stable selectors and deterministic runs for automation.
- As a returning player, I want to jump in quickly for a short session.

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

### Feature Flags

- `cliVerbose` — show log panel.
- `cliShortcuts` — enable single-key shortcuts.
- `battleStateBadge` — header badge reflecting state.
- `autoSelect` — auto-pick on timeout.
- `skipRoundCooldown` — bypass inter-round countdown.

---

## UX Specification

### Layout (single column, desktop & mobile)

```text
+-----------------------------------------+
| bash - JU-DO-KON                        |
+-----------------------------------------+
| Classic Battle - CLI | Round 2 | You: 1 |
|                      |  of 5   | CPU: 1 |
+-----------------------------------------+
| [TIMER] 07s                             |
| >> Choose your stat:                    |
|   (1) Power ................. 8         |
|   (2) Speed ................. 7         |
|   (3) Technique ............. 9         |
|   (4) Kumi-kata ............. 6         |
|   (5) Ne-waza ............... 7         |
|-----------------------------------------|
| >> Last: You WON (Technique 9 vs 7)     |
|-----------------------------------------|
| [1-5] Select | [Enter/Space] Next | [H] |
+-----------------------------------------+
```

### Enhancements

- **Terminal Title Bar**: Enhanced gradient styling with authentic terminal appearance.
- **ASCII Indicators**: `[TIMER]` for timer, `>>` for prompts and results, `|` for separators.
- **Professional Separators**: Explicit hyphenated separators instead of box drawing glyphs.
- **Typography Excellence**: Consistent 8px rhythm, improved line-height 1.45.
- **Enhanced Stat List**: Refined padding, hover states, and visual feedback.
- **Terminal Colors**: Command prompt styling with proper terminal background.
- **Improved Contrast**: Enhanced from basic compliance to 7:1+ for primary text.
- **Warning Indicators**: Timer warning color (#ffcc00) when approaching expiry.
- **Status Text**: Better contrast (#ffffff, #e0e0e0) for improved readability.
- **Mobile Optimization**: Smaller text sizes while preserving 44px tap targets.
- **Background Hierarchy**: Subtle background variations for visual organization.
- **Focus States**: Enhanced visibility while maintaining terminal aesthetics.

**Layout Structure**: Single column design optimized for both desktop and mobile with responsive adjustments that maintain terminal authenticity across all screen sizes.

---

## Accessibility Requirements

- WCAG 2.1 AA compliance preserved and enhanced.
- Touch target ≥44px.
- Keyboard navigation unchanged.
- Screen reader announcements preserved.
- Logical tab order; ESC closes modals.
- Focus indicators visible and authentic to terminal style.

---

## Observability & Telemetry

- Verbose pane (flagged) listing timestamped transitions, inputs, and ticks.
- Structured test hooks (data-attrs for round/time).
- Console routed via logger, silenced in CI.

---

## Error & Edge Cases

- Invalid keys ignored; small hint “Press H for help.”
- Rapid multi-input debounced.
- Timers pause on tab hide; resume on return.
- Unexpected error: readable message, rollback to safe state.
- Quit confirmation pauses/resumes timers as expected.

---

## Acceptance Criteria (BDD-style)

- Engine parity: The CLI reuses the Classic Battle engine/state machine without forking. Automated parity tests pass (unit/integration).
- Keyboard controls: Numeric keys `1–5` select stats; `Enter`/`Space` advances rounds; `H` opens help within 1s; `Q` quits with confirmation; `Esc` closes help. Tests verify each mapping.
- Pointer/touch parity: Stat rows are clickable/tappable with targets ≥44px; taps register the same selection flow as keyboard.
- Timer behavior: Countdown updates at 1 Hz; expiry triggers auto-select if `autoSelect` is enabled and mirrors engine behavior.
- Outcome & score: Win/Loss/Draw states render correctly and scores update immediately after round resolution.
- Accessibility: Screen reader announcements exist for prompts/timers/outcomes using `aria-live` regions; logical focus order is preserved; WCAG 2.1 AA checks pass in CI.
- Test hooks: Stable selectors exist (`#cli-root`, `#cli-countdown`, `#cli-score`, `#snackbar-container`, `data-round`, `data-remaining-time`) and are used by Playwright tests.
- Determinism: `?seed=` param produces repeatable runs; invalid seeds fall back to a deterministic default and are logged.
- Settings persistence: Win target persists under `localStorage` key `battleCLI.pointsToWin` and restores on startup.
- Observability: Verbose log mode shows timestamped transitions and can be toggled via `cliVerbose` feature flag; logs are silenced in CI.
- Bootstrap helpers: Startup helpers (`autostartBattle()`, `renderStatList()`, `restorePointsToWin()`) are present and covered by unit tests.
- Error handling: Invalid inputs are ignored with a short hint; JSON load failures show a readable error and default fallback.

## Appendix: CLI Usage & Developer Notes

This appendix consolidates the previously separate CLI usage, module structure, and testing guides so implementation details live alongside the authoritative PRD. The appendix is implementation-adjacent and does not change the PRD's functional requirements.

### Controls

- Number keys `1–5`: select stats.
- `Enter`/`Space`: advance rounds.
- `Q`: quit match (confirmation required).
- `H`: toggle help panel (must open within 1s).
- `Esc`: close help or dismiss dialogs.

### Interactive & Display Elements

- Stats: selectable via keyboard and clickable/tappable rows (≥44px).
- State badge: `#battle-state-badge` reflects the current machine state for visibility and tests.
- Bottom line / Snackbar: Status line renders in `#snackbar-container` for short messages and countdown hints.
- Win target: Header selector (5/10/15) persisted to `localStorage` at `battleCLI.pointsToWin`.
- Verbose log: Optional header toggle to enable an event/state transition log for debugging.

### Module Structure

- `src/pages/battleCLI/state.js` centralizes mutable flags and the Escape key promise.
- `src/pages/battleCLI/events.js` delegates keyboard handling to helpers: `handleArrowNav(e)` (arrow key focus management), `shouldProcessKey(key)` (guards against invalid input/state), and `routeKeyByState(key)` (dispatches to state-appropriate handlers).
- Stat list helpers encapsulate rendering logic:
  - `loadStatDefs()` — loads stat metadata and resolves feature flags.
  - `buildStatRows(stats, judoka)` — composes stat rows with numeric key mappings and judoka data.
  - `renderHelpMapping(stats)` — syncs the on-screen help legend with the active stat definitions.
  - `ensureStatClickBinding(list)` — binds click/tap handlers and preserves pointer parity with keyboard controls.
- Public entry points are exposed via `src/pages/index.js`, e.g. `import { battleCLI, onKeyDown } from "src/pages/index.js"`.

### Bootstrap Helpers (Developer)

- `autostartBattle()` — initializes and wires up the battle engine for the CLI surface.
- `renderStatList()` — renders numeric-key-mapped stat rows and attaches input handlers.
- `restorePointsToWin()` — restores persisted win target from `localStorage`.

### Layout & Validation Status

- **CLI Layout** is PRD compliant (last Playwright assessment 2024) with responsive grid behavior and 44px minimum touch targets.
- `#cli-stats` relies on CSS Grid; `.cli-stat` maintains 44px minimum height and accessible focus rings.
- Height reservations (`min-height: 8rem`) prevent layout instability and layout shift.
- Terminal aesthetic: monospace typography, CLI gradient title bar, and retro color themes.
- Accessibility coverage: ARIA live regions, screen reader labels, and keyboard navigation parity.
- Validation suites live in `playwright/cli-layout-assessment.spec.js` and should stay aligned with PRD requirements.

### Usage & Key Workflows

- `onKeyDown` processes CLI key events and respects `shouldProcessKey`/`routeKeyByState` guardrails.
- The `battleCLI` export exposes helpers (e.g., `renderStatList`) for integration tests and bootstrap scripts.
- Background clicks advance the flow from `roundOver` or `cooldown` states but ignore stat row clicks to avoid misfires.
- Round target acquisition requests `initRoundSelectModal` and falls back to a **Start match** button if the modal fails to load.
- Numeric `?seed=` values enable deterministic test mode; clearing or providing invalid input disables test mode and restores default randomness.

### Testing Notes

- CLI-specific Playwright coverage (`playwright/battle-cli.spec.js`) exercises keyboard selection flow, state badge updates, verbose log behaviour, and keyboard-only playthroughs.
- Layout validation is automated via `playwright/cli-layout-assessment.spec.js` to confirm responsive structure, touch targets, and CLI-specific accessibility.
- Visual regression and accessibility checks include the CLI view to confirm touch targets, contrast, announcements, and terminal styling remain compliant.

### Headless & Test Modes

- Enable deterministic, fast simulations with `setHeadlessMode(true)` (removes waits) and `setTestMode(true)` (deterministic RNG).
- `getEscapeHandledPromise()` resolves when Escape handling completes, simplifying async tests.

### Battle State Helpers

- `handleBattleState` orchestrates UI updates and delegates to helpers such as `updateUiForState(state)`, `ensureNextRoundButton()`, and `logStateChange(from, to)` to append timestamped entries to the verbose log.

---

## Dependencies

- Classic Battle engine/state table.
- Settings storage helper.
- Logger utility.

---

## Implementation Notes

- DOM/test selectors remain unchanged.
- Styling is additive, no functional regressions.
- CSS file `src/styles/cli-immersive.css` introduced for immersive styling.

---

## Testing & Verification

- Visual regression testing.
- Accessibility compliance (WCAG 2.1 AA).
- Touch target verification.
- Keyboard navigation flows.
- Screen reader compatibility.

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
  - [ ] 5.1 Add win target selector with localStorage persistence.
  - [ ] 5.2 Implement deterministic seed handling with URL param support.
  - [ ] 5.3 Handle timer pause/resume for quit confirmation dialogs.

---

## Recent Improvements (Legacy Design Alignment)

**Implementation Status**: ✅ COMPLETED  
**Update Date**: September 2025

### Typography & Visual Enhancements Implemented

- **Enhanced Readability**: Line-height improved to 1.45 for optimal monospace text readability
- **Consistent Spacing**: Applied 8px rhythm throughout interface for professional appearance
- **Typography Hierarchy**: Refined font weight distribution for cleaner visual organization
- **Superior Contrast**: Enhanced contrast ratios from basic WCAG compliance to 7:1+ for primary text elements

### Terminal Authenticity Improvements

- **Professional Title Bar**: Implemented gradient terminal title bar with authentic styling
- **ASCII Enhancement**: Added semantic indicators ([TIMER] timer, >> prompts/results, | separators)
- **Separator Upgrade**: Replaced basic `---` with professional `────────────────────────`
- **Command Styling**: Enhanced prompt appearance with proper terminal colors and backgrounds

### User Experience Refinements

- **Layout Optimization**: Improved header proportions (64px vs previous 56px height)
- **Interactive Feedback**: Enhanced stat list hover states and visual feedback mechanisms
- **Status Clarity**: Added arrow indicators for round messages with improved contrast
- **Control Hints**: Terminal-style pipe separators for consistent formatting

### Accessibility Preservation

All improvements maintain and enhance existing accessibility standards:

- ✅ WCAG 2.1 AA compliance preserved and improved
- ✅ Touch target requirements (≥44px) maintained across all interactive elements
- ✅ Keyboard navigation patterns unchanged and enhanced
- ✅ Screen reader announcements preserved with improved clarity
- ✅ Mobile responsiveness improved while maintaining usability standards

### Performance & Compatibility

- **Mobile Optimization**: Responsive scaling with appropriate text sizes while preserving touch targets
- **Cross-Device**: Consistent terminal aesthetics across desktop, tablet, and mobile platforms
- **Loading Performance**: Maintained fast load times (<500ms) with enhanced visual appeal
- **Memory Efficiency**: Preserved low memory footprint (<30MB) target requirements

---

- [ ] 5.1 Add seed-based determinism and localStorage persistence.
- [ ] 5.2 Handle timer pause/resume on tab visibility change.
- [ ] 5.3 Display helpful errors and fallback UIs.
