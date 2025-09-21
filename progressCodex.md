# QA Report & Improvement Plan: `src/pages/battleCLI.html`

This document provides a Quality Assurance (QA) analysis of the `battleCLI.html` page and outlines opportunities for improvement.

## 1. Confirmed Issues

The following issues reported have been verified against the current version of the file.

### 1.1. Critical: Battle Fails to Start (Issue #1)

- **Observation**: After selecting a match length (e.g., "Quick"), the game does not begin. The UI remains in its initial pre-battle state.
- **Expected**: The battle should commence, displaying "Round 1 of N", starting a countdown, and presenting stats for selection.
- **Analysis**: This is a critical blocker. The issue likely lies in the JavaScript (`battleCLI.init.js`) where the event listener for match selection fails to trigger the battle engine's start sequence.

### 1.2. UI/UX: Input Handling Conflicts (Issues #3, #7)

- **Observation**: Typing numbers into the "Seed" input field incorrectly triggers "Invalid key" warnings. This indicates global keyboard shortcuts are not being suppressed when an input field has focus.
- **Expected**: Input fields should have exclusive control over keyboard input when focused.
- **Analysis**: The global keydown handler needs to check `event.target` to ensure it's not an input element before processing game commands.

### 1.3. UI/UX: Persistent Modal Artifacts (Issue #2)

- **Observation**: Text from the round-selection modal remains on screen after the modal closes, overlapping the stat selection area.
- **Expected**: Modal elements should be completely removed from the DOM upon closing.
- **Analysis**: The cleanup logic for the modal is incomplete. It fails to remove all injected nodes.

### 1.4. UI/UX: Redundant & Misaligned Scoreboard (Issue #4)

- **Observation**: The header displays duplicate and misaligned scoreboard information (e.g., "Round 0 of 0" and "You: 0 Opponent: 0").
- **Expected**: A single, clean scoreboard should be present as defined in wireframes.
- **Analysis**: The HTML contains two sets of scoreboard elements: one visible (`#cli-round`, `#cli-score`) and one hidden (`.standard-scoreboard-nodes`). This redundancy is the likely cause and should be consolidated.

### 1.5. Functional: Verbose Mode is Not Implemented (Issue #8)

- **Observation**: The "Verbose" checkbox can be toggled, but the corresponding log panel never appears.
- **Expected**: Enabling verbose mode should display a log of battle events.
- **Analysis**: The HTML contains a hidden `<section id="cli-verbose-section">` prepared for this feature, but the JavaScript logic to un-hide and populate it is missing.

## 2. Partially Inaccurate Issues

### 2.1. Accessibility: Timer `aria-live` region is present (Issue #6)

- **Original Report**: Claimed the countdown timer (`#cli-countdown`) lacks an `aria-live` attribute.
- **Verification**: The element **does** have `aria-live="polite"` and `role="status"`. The report was likely based on an outdated version or was confused by the duplicate, hidden scoreboard which has `aria-live="off"`.
- **Conclusion**: While the specific claim is inaccurate, the broader goal of ensuring all dynamic content is announced to screen readers is valid and should be a priority.

## 3. Feasibility & Improvement Opportunities

All identified issues are highly feasible to fix. The following is a prioritized list of recommendations.

### 3.1. Core Functionality

1. **Fix Battle Start Logic**: Prioritize fixing the event handler for match length selection to correctly initialize the battle engine. This will resolve the main blocker (#1) and the dependent issue of stats/timer not appearing (#5).
2. **Refine Keyboard Input Handling**: Modify the global key listener to ignore input when form elements (`input`, `select`) are focused. This will fix the "Invalid key" warnings (#3, #7).

### 3.2. UI & Code Hygiene

3. **Consolidate Scoreboard HTML**: Remove the redundant `.standard-scoreboard-nodes` from the HTML. All JavaScript logic should update a single, authoritative scoreboard structure to fix rendering bugs (#4).
4. **Ensure Complete Modal Cleanup**: Update the modal's closing sequence to remove all of its DOM elements, preventing UI artifacts (#2).
5. **Implement Verbose Logging**: Hook up the "Verbose" checkbox to toggle the visibility of the `#cli-verbose-section` and populate it with game events.

### 3.3. Accessibility (A11y)

6. **Audit ARIA Live Regions**: Verify that all dynamic content—including score changes, round results, and prompts—are correctly announced by screen readers. While the timer is correctly configured, a full audit is recommended.
7. **Manage Focus**: Ensure logical focus management. For example, after a modal closes, focus should return to a sensible element in the main UI. When a stat is selected via keyboard, the focus indicator should be visible on that stat.

### 3.4. Codebase Quality

8. **Externalize CSS**: The large `<style>` block in the `<head>` should be moved to a dedicated `.css` file. This improves maintainability, enables caching, and separates concerns.
9. **Improve Semantic HTML**: Review the use of ARIA roles. For instance, when the stat skeleton placeholders are replaced with actual stats, the `<li>`-like elements should have `role="option"` within the `role="listbox"` container.
10. **Establish Test Hooks**: Solidify `data-testid` attributes for all key interactive elements and status displays as a best practice, facilitating more robust Playwright or Vitest testing.
