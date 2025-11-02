# PRD: Battle Action Bar

**Entry Point:** `src/helpers/actionBar.js`
**Used By:** Classic Battle (UI + CLI), Battle Bandit, Battle Quick, future battle modes
**Replaces:** Global bottom navigation / foot bar
**Related Docs:**

- `prdBattleClassic.md`
- `prdBattleCLI.md`
- `prdBattleBandit.md`
- `prdBattleQuick.md`
- `prdBattleScoreboard.md`

---

## 1. Overview

The **Battle Action Bar** is a mandatory, mode-agnostic interaction component that replaces a bottom navigation/foot bar in all battle modes. It provides players with a consistent control surface across battles while allowing mode-specific styling and tactile feedback.

### Structure

- **Leftmost:** Options button → opens modal with battle + global settings.
- **Middle (5 buttons):** Direct mappings to judoka card stats (Power, Speed, Technique, Kumi-kata, Ne-waza). Always visible; enabled only when stat selection is required.
- **Rightmost:** Action button → advances the match (Start, Draw, Next).

The Action Bar is designed to be reusable, themeable, and observable, ensuring a unified user experience across all game modes.

---

## 2. Problem Statement

Previously, battle modes relied on the global bottom navigation bar, which provided little utility during matches and fragmented the user experience. Each battle mode handled controls differently, increasing complexity, inconsistency, and user confusion. A dedicated, unified Action Bar is needed to:

- Align interaction across all battle modes.
- Reduce duplication of UI logic.
- Provide consistent hooks for testing, accessibility, and observability.
- Be stylable per mode while preserving core structure and behavior.

> **User Impact:** In user tests (8/10 playtesters, ages 9–12), players clicked outside stat buttons or failed to progress due to inconsistent control placements, leading to frustration and abandoned matches.

---

## 3. Goals

1.  **Mandatory Control Surface:** A required component for all battle modes, replacing the old bottom navigation.
2.  **Unified Structure:** A consistent layout: Options button, five stat buttons, and an action button.
3.  **Mode-Specific Flexibility:** A consistent base component that is themeable via a `.action-bar--{mode}` CSS class.
4.  **Accessible Design:** Full keyboard navigation, ARIA labels, and screen-reader support to meet WCAG 2.1 AA compliance.
5.  **Testability:** Expose `data-*` attributes for state inspection and automated testing.
6.  **Resilience:** Buttons are locked/disabled when interaction is invalid (e.g., during cooldowns or non-select states).
7.  **Responsive and Tactile:** All button interactions must include 150–200 ms feedback animations (e.g., press pulse, modal fade).

---

## 4. Functional Requirements

| Priority | ID  | Requirement                            | Details                                                                                                         |
| :------- | :-- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **P1**   | 1   | Render 7 buttons in a fixed order      | Options, Stat1–5, Action.                                                                                       |
| **P1**   | 2   | Options button opens a modal           | Modal contains: Quit (→ confirm then landing page), Replay, Audio toggle, Reduced Motion toggle.                |
| **P1**   | 3   | Default states for options             | Audio = ON, Reduced Motion = OFF.                                                                               |
| **P1**   | 4   | Stat buttons map to judoka stats       | Power, Speed, Technique, Kumi-kata, Ne-waza.                                                                    |
| **P1**   | 5   | Stat buttons are conditionally enabled | Always visible, but only enabled when the battle engine state requires selection.                               |
| **P1**   | 7   | Action button updates dynamically      | Label changes with engine state (e.g., Start, Draw, Next). MVP: “Next”.                                         |
| **P1**   | 8   | Action button locks during cooldowns   | Disabled/locked during cooldowns or invalid states.                                                             |
| **P1**   | 9   | Listen to engine state changes         | Component must observe the engine/orchestrator and update the UI accordingly.                                   |
| **P1**   | 10  | Expose observability hooks             | Use `data-*` attributes (`data-action-state`, `data-options-open`, `data-stat-enabled`).                        |
| **P2**   | 11  | Theming via CSS hooks                  | `.action-bar--classic`, `.action-bar--cli`, `.action-bar--bandit`, `.action-bar--quick`.                        |
| **P2**   | 12  | Full accessibility support             | ARIA labels for all buttons, keyboard shortcuts (`1–5` for stats, `O` for options, `Enter`/`Space` for action). |
| **P2**   | 13  | Responsive design                      | Works across screen sizes and modes (desktop-first, text-first in CLI).                                         |
| **P3**   | 6   | Mode-specific tooltips/labels          | Classic mode uses icons, CLI mode uses text labels.                                                             |
| **P3**   | 14  | Tactile feedback animations            | Button presses and modal open/close animations use 150–200 ms transitions.                                      |

---

## 5. Non-Functional Requirements

- **Performance:** Lightweight with no animation bottlenecks.
- **Resilience:** Must degrade gracefully if the engine state is missing (e.g., disabled buttons, placeholder labels).
- **Testability:** Deterministic behavior in test environments.
- **Maintainability:** Centralized logic in `actionBar.js`; no mode-specific forks.
- **Telemetry:** Desync or state errors must log to the in-game console and trigger an analytics event `battle.actionbar.desync`.

---

## 6. Acceptance Criteria

### Stat Button Enablement

- **Given** I am in a battle mode
- **When** the engine state requires stat selection
- **Then** all five stat buttons must be enabled
- **And** when the state does not require stat selection
- **Then** the stat buttons must be visible but disabled

### Options Modal

- **Given** I press the Options button
- **Then** a modal must appear with a 150 ms fade-in animation
- **And** it must include Quit, Replay, Audio toggle (default ON), and Reduced Motion toggle (default OFF)

### Quit Option

- **Given** I select Quit in the Options modal
- **Then** I must see a confirmation dialog with "Cancel" pre-selected
- **And** confirming must return me to the Landing Page and reset the battle state

### Action Button Lock

- **Given** I am in a cooldown state
- **Then** the Action button must appear disabled (reduced opacity)
- **And** pressing it must not trigger any state change

### Styling by Mode

- **Given** I enter a Classic Battle
- **Then** the Action Bar must have `.action-bar--classic` styling
- **And** in CLI mode
- **Then** the Action Bar must render as text-based with a monospace font

### Accessibility

- **Given** I use a keyboard
- **Then** pressing keys `1–5` must trigger the corresponding stat button
- **And** pressing `O` must open the Options modal
- **And** pressing `Enter` or `Space` must trigger the Action button

---

## 7. Edge Cases & Failure States

1.  **Missing Engine State:** If engine data is undefined, render the bar with all buttons disabled and tooltips indicating an unavailable state.
2.  **Options Modal Render Failure:** Fallback to a toast message: “Settings unavailable — please retry.”
3.  **Shortcut Conflict:** If shortcut keys are already bound globally (e.g., by browser extensions), log the conflict and allow mouse fallback.
4.  **Desync:** If the UI and engine are out of sync for >300 ms, trigger an automatic re-sync event and log the telemetry event `battle.actionbar.desync`.

---

## 8. Design and UX

### Layout Mockup (Textual Reference)

```
[ ⚙ Options ] [ Power ] [ Speed ] [ Technique ] [ Kumi-kata ] [ Ne-waza ] [ ▶ Next ]
```

- **Left group:** 1 button (Options)
- **Center group:** 5 stat buttons (equal width, centered)
- **Right group:** 1 action button (highlighted)

### Design Tokens

- **Base font:** 14–16 px
- **Icon size:** 20–24 px
- **Min button width:** 48 px (for touch targets)
- **Hover/focus:** 150 ms color fade
- **Modal fade-in/out:** 200 ms
- **Color Contrast:** Must pass WCAG 2.1 AA (≥4.5:1).
- **Focus Ring:** 2px blue outline, keyboard-only.
- **Reduced Motion:** Respects `prefers-reduced-motion` system setting.

---

## 9. Quit Flow

When the player selects **Quit**:

1.  A confirmation dialog appears with **Cancel** pre-selected.
2.  On confirmation, the player is returned to the **Landing Page**.
3.  The current battle state is **reset**, discarding any in-progress match data.
4.  A `battle.quit` event is logged to telemetry.

---

## 10. Implementation Plan

### Phase 1: Core Component & Options Modal

- [x] **1.1: Base Action Bar Component** ✅ COMPLETED 2025-11-01
  - [x] Create the 7-button layout.
  - [x] Wire it to the `battleEngine` state via observer hooks.
  - [x] Add ARIA labels and basic keyboard shortcuts.
  - [x] Expose `data-*` observability attributes.
- [ ] **1.2: Options Modal**
  - [ ] Implement the modal UI with Quit, Replay, Audio, and Motion toggles.
  - [ ] Set default states: Audio = ON, Reduced Motion = OFF.
  - [ ] Add a confirmation dialog for the Quit action, with "Cancel" as the default focus.
  - [ ] Implement a 150–200 ms fade animation for modal open/close.

### Phase 2: Button Logic & State Handling

- [ ] **2.1: Stat Button Logic**
  - [ ] Map stat buttons to engine states (enabled/disabled).
  - [ ] Display tooltips/icons based on the game mode.
  - [ ] Implement keyboard mappings `1–5`.
  - [ ] Add a 150 ms "active" pulse animation on press.
- [ ] **2.2: Action Button State Handling**
  - [ ] Reflect the engine state (Next, Start, Draw).
  - [ ] Disable the button during cooldowns or invalid states.
  - [ ] Map `Enter`/`Space` to trigger the button.
  - [ ] Add 200 ms button press feedback animation.

### Phase 3: Theming, Testing & Error Handling

- [ ] **3.1: Theming & Styling**
  - [ ] Integrate theming hooks for each mode (`.action-bar--classic`, `.action-bar--cli`, etc.).
- [ ] **3.2: Testing & Accessibility**
  - [ ] Write unit tests for all button states.
  - [ ] Verify ARIA labels with screen reader tools.
  - [ ] Validate keyboard and focus navigation.
  - [ ] Ensure color contrast meets or exceeds a 4.5:1 ratio.
- [ ] **3.3: Error Handling & Telemetry**
  - [ ] Implement desync logging (`battle.actionbar.desync`).
  - [ ] Create a toast fallback for modal render failures.
  - [ ] Implement an auto-resync mechanism if the UI is out of sync for >300 ms.

---

## 11. Progress Log

### Task 1.1: Base Action Bar Component ✅

**Date Completed:** 2025-11-01

**Implementation Summary:**

1. **Created `/src/helpers/actionBar.js`** with the `createActionBar()` factory function
   - 7-button layout: Options (⚙) | Power, Speed, Technique, Kumi-kata, Ne-waza | Action (▶)
   - Full keyboard shortcut support: 1-5 for stats, O for options, Enter/Space for action
   - Engine state observation via event listeners (roundStart, roundEnd, statSelected)
   - Complete state management API: setStatButtonsEnabled(), setActionButtonState(), getState(), update()
   - ARIA labels and semantic HTML for accessibility
   - data-\* attributes for testing and observability

2. **Created `/src/styles/actionBar.css`** with comprehensive styling
   - Base responsive layout with flexbox
   - Mode-specific theming: `.action-bar--classic`, `.action-bar--cli`, `.action-bar--bandit`, `.action-bar--quick`
   - 150ms button hover animations (respects prefers-reduced-motion)
   - Action button highlighted with blue color and shadow
   - Stat buttons show enabled state via data-stat-enabled attribute
   - Mobile-responsive breakpoints for small screens

3. **Created `/tests/unit/actionBar.test.js`** with comprehensive test coverage
   - 39 tests covering initialization, DOM rendering, interactions, keyboard shortcuts, state management, lifecycle, and accessibility
   - All tests passing ✅

**Key Features Implemented:**

- ✅ 7-button fixed layout (Options, 5 Stats, Action)
- ✅ Dynamic button state management (enabled/disabled)
- ✅ Keyboard shortcuts (1-5, O, Enter/Space)
- ✅ Engine state observation
- ✅ ARIA labels and accessibility
- ✅ data-\* attributes for testing
- ✅ Mode-specific CSS classes
- ✅ Responsive design
- ✅ Lifecycle management (render, destroy)
- ✅ Handler callbacks (onStatSelected, onActionClick, onOptionsClick)

**Test Results:**

- ✅ Unit Tests: **39 passed**
- ✅ Linting: PASS (eslint)

**Deliverables:**

- `/src/helpers/actionBar.js` - Main component
- `/src/styles/actionBar.css` - Styling
- `/tests/unit/actionBar.test.js` - Unit tests

**Notes:**

- Component is mode-agnostic and can be used across all battle modes
- CSS is integrated but needs to be imported in the main stylesheet
- Engine event subscription is in place but handlers are optional
- Keyboard shortcuts are global and automatically attached/removed with render/destroy
