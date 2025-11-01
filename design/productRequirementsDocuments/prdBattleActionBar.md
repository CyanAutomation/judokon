# PRD: Battle Action Bar

**Entry Point:** `src/helpers/actionBar.js`
**Used By:** Classic Battle (UI + CLI), Battle Bandit, Battle Quick, future battle modes
**Replaces:** Global bottom navigation / foot bar
**Related Docs:** [prdBattleClassic.md], [prdBattleCLI.md], [prdBattleBandit.md], [prdBattleQuick.md], [prdBattleScoreboard.md]

---

## 1. TL;DR

The **Battle Action Bar** is a **mandatory, mode-agnostic interaction component** that replaces the bottom navigation/foot bar in all battle modes.
It provides players with a **consistent control surface** across battles while allowing **mode-specific styling and tactile feedback**.

**Structure:**

* **Leftmost:** Options button → opens modal with battle + global settings.
* **Middle (5 buttons):** Direct mappings to judoka card stats (Power, Speed, Technique, Kumi-kata, Ne-waza). Always visible; enabled only when stat selection is required.
* **Rightmost:** Action button → advances the match (Start, Draw, Next).

The Action Bar is **reusable, themeable, and observable**, ensuring a unified user experience across Classic, CLI, Bandit, and Quick modes.

---

## 2. Problem Statement

Previously, battle modes relied on the global bottom navigation bar, which provided little utility during matches and fragmented the experience.
Each battle mode handled controls differently, increasing **complexity, inconsistency, and user confusion**.

We need a **dedicated, unified Action Bar** that:

* Aligns interaction across battle modes.
* Reduces duplication of UI logic.
* Provides consistent hooks for testing, accessibility, and observability.
* Can be styled per mode while preserving core structure and behaviour.

**Example impact:** In prior user tests (8/10 playtesters, ages 9–12), players clicked outside stat buttons or failed to progress due to inconsistent placements, leading to frustration and dropped matches.

---

## 3. Goals

1. **Mandatory control surface** for all battle modes, replacing bottom navigation.
2. **Unified structure:** Options button, five stat buttons, action button.
3. **Mode-specific flexibility:** Consistent base component, themeable via `.action-bar--{mode}` CSS class.
4. **Accessible design:** Keyboard shortcuts, ARIA labels, screen-reader friendly. Must pass WCAG 2.1 AA compliance.
5. **Testability:** Expose `data-*` attributes for state inspection and automated testing.
6. **Resilience:** Lock/disable buttons when interaction is invalid (cooldowns, non-select states).
7. **Responsive and tactile:** All button interactions must include **150–200 ms feedback animations** (press pulse, modal fade).

---

## 4. Functional Requirements

| #  | Requirement                                                                                                                   | Priority |
| -- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1  | Must render **7 buttons** in fixed order: Options, Stat1–5, Action                                                            | High     |
| 2  | Options button opens a **modal** with: Quit (→ confirm then landing page), Replay, Audio toggle, Reduced Motion toggle        | High     |
| 3  | **Default states:** Audio = ON, Reduced Motion = OFF                                                                          | High     |
| 4  | Stat buttons map to **Power, Speed, Technique, Kumi-kata, Ne-waza**                                                           | High     |
| 5  | Stat buttons always visible but only **enabled** when the battle engine state requires selection                              | High     |
| 6  | Tooltips/labels displayed depending on mode style (Classic = icons, CLI = text labels)                                        | Medium   |
| 7  | Action button updates dynamically with engine state (Start, Draw, Next). MVP: “Next”                                          | High     |
| 8  | Action button must disable/lock during cooldowns or invalid states                                                            | High     |
| 9  | Component must **listen to engine/orchestrator state changes** and update UI accordingly                                      | High     |
| 10 | Expose observability hooks via `data-*` attributes (`data-action-state`, `data-options-open`, `data-stat-enabled`)            | High     |
| 11 | Theming via explicit CSS hook points: `.action-bar--classic`, `.action-bar--cli`, `.action-bar--bandit`, `.action-bar--quick` | High     |
| 12 | Accessibility: ARIA labels for all buttons, keyboard shortcuts (`1–5` = stats, `O` = options, `Enter/Space` = action)         | High     |
| 13 | Works across screen sizes and modes (desktop-first, text-first in CLI)                                                        | High     |
| 14 | Button press and modal open/close animations use **150–200 ms transitions** for tactile feedback                              | Medium   |

---

## 5. Non-Functional Requirements

* **Performance:** Lightweight, no animation bottlenecks.
* **Resilience:** Must degrade gracefully if the engine state is missing (e.g., disabled buttons, placeholder labels).
* **Testability:** Deterministic behaviour in test environments.
* **Maintainability:** Centralized logic in `actionBar.js`, no mode-specific forks.
* **Telemetry:** Desync or state errors must log to the in-game console and analytics event `battle.actionbar.desync`.

---

## 6. Acceptance Criteria (Gherkin)

**Stat button enablement**
Given I am in a battle mode
When the engine state requires stat selection
Then all five stat buttons must be enabled
And when the state does not require stat selection
Then the stat buttons must be visible but disabled

**Options modal**
Given I press the Options button
Then a modal must appear with 150 ms fade-in
And it must include Quit, Replay, Audio toggle (default ON), and Reduced Motion toggle (default OFF)

**Quit option**
Given I select Quit in the Options modal
Then I must see a confirmation dialog with Cancel preselected
And confirming must return me to the Landing Page and reset battle state

**Action button lock**
Given I am in a cooldown state
Then the Action button must appear disabled (reduced opacity)
And pressing it must not trigger any state change

**Styling by mode**
Given I enter a Classic Battle
Then the Action Bar must have `.action-bar--classic` styling
And in CLI mode
Then the Action Bar must render as text-based with monospace font

**Accessibility**
Given I use a keyboard
Then pressing keys `1–5` must trigger the corresponding stat button
And pressing `O` must open the Options modal
And pressing `Enter` or `Space` must trigger the Action button

---

## 7. Edge Cases / Failure States

1. **Missing Engine State:** If engine data is undefined, render bar with all buttons disabled and tooltips indicating unavailable state.
2. **Options Modal Render Failure:** Fallback to a toast message “Settings unavailable — please retry.”
3. **Shortcut Conflict:** If shortcut keys are already bound globally (e.g., browser extensions), log conflict and allow mouse fallback.
4. **Desync:** If UI and engine are out of sync for >300 ms, trigger automatic re-sync event and log telemetry `battle.actionbar.desync`.

---

## 8. Design and UX Considerations

### **Layout Mockup (Textual Reference)**

```
[ ⚙ Options ] [ Power ] [ Speed ] [ Technique ] [ Kumi-kata ] [ Ne-waza ] [ ▶ Next ]
```

* Left group: 1 button (Options)
* Center group: 5 stat buttons (equal width, centered)
* Right group: 1 action button (highlighted)

**Design Tokens:**

* Base font: 14–16 px
* Icon size: 20–24 px
* Min button width: 48 px (touch target)
* Hover/focus: 150 ms color fade
* Modal fade-in/out: 200 ms

**Color Contrast:** Pass WCAG 2.1 AA (≥4.5:1).
**Focus Ring:** 2 px blue outline, keyboard only.
**Reduced Motion:** Respect system `prefers-reduced-motion`.

---

## 9. Quit Flow

When the player selects **Quit**:

1. A confirmation dialog appears with **Cancel** preselected.
2. On confirmation, the player is returned to the **Landing Page**.
3. The current battle state is **reset**, discarding any in-progress match data.
4. A `battle.quit` event is logged to telemetry.

---

## 10. Tasks

* [ ] 1.0 Implement Base Action Bar Component

  * [ ] 1.1 Create layout with 7-button structure
  * [ ] 1.2 Wire to `battle engine` state via observer hooks
  * [ ] 1.3 Add ARIA labels and keyboard shortcuts
  * [ ] 1.4 Expose `data-*` observability attributes
  * [ ] 1.5 Integrate theming hooks by mode

* [ ] 2.0 Options Modal

  * [ ] 2.1 Implement modal UI with Quit, Replay, Audio, Motion toggles
  * [ ] 2.2 Set **Audio = ON**, **Reduced Motion = OFF** defaults
  * [ ] 2.3 Add confirmation dialog for Quit (Cancel default focus)
  * [ ] 2.4 Add 150–200 ms fade animation for modal open/close

* [ ] 3.0 Stat Button Logic

  * [ ] 3.1 Map stat buttons to engine states (enable/disable)
  * [ ] 3.2 Display tooltips/icons per mode
  * [ ] 3.3 Implement keyboard mappings `1–5`
  * [ ] 3.4 Add 150 ms active pulse animation

* [ ] 4.0 Action Button State Handling

  * [ ] 4.1 Reflect engine state (Next, Start, Draw)
  * [ ] 4.2 Disable during cooldowns or invalid states
  * [ ] 4.3 Map `Enter/Space` to trigger
  * [ ] 4.4 Add 200 ms button press feedback

* [ ] 5.0 Testing & Accessibility

  * [ ] 5.1 Unit test button states
  * [ ] 5.2 Verify ARIA labels with screen reader tools
  * [ ] 5.3 Validate keyboard and focus navigation
  * [ ] 5.4 Ensure color contrast ≥ 4.5:1

* [ ] 6.0 Error Handling & Telemetry

  * [ ] 6.1 Implement desync logging (`battle.actionbar.desync`)
  * [ ] 6.2 Toast fallback for modal render failures
  * [ ] 6.3 Auto-resync UI after 300 ms delay

---

## 11. Prioritized Functional Requirements

| Priority | Feature                               | Description                                                   |
| :------- | :------------------------------------ | :------------------------------------------------------------ |
| **P1**   | Core Action Bar Rendering             | Create base 7-button layout and bind to battle engine state.  |
| **P1**   | Options Modal (Quit, Replay, Toggles) | Implement modal with confirmation and default toggle states.  |
| **P1**   | Action Button State Sync              | Dynamically updates label and lock state based on engine.     |
| **P2**   | Stat Button Enablement Logic          | Activate/deactivate stat buttons based on engine triggers.    |
| **P2**   | Accessibility & Keyboard Support      | ARIA labels, shortcuts, and WCAG compliance testing.          |
| **P3**   | Mode-Specific Theming                 | Apply `.action-bar--{mode}` variations for style consistency. |
| **P3**   | Error Handling & Telemetry Logging    | Provide graceful fallback and analytics tracking for desyncs. |
| **P4**   | Visual & Motion Enhancements          | Add responsive button animations and modal transitions.       |

---