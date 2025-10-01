# QA Report: Feature Flags

**Date:** October 1, 2025
**Source File:** `src/pages/settings.html`

## 1. Executive Summary

A review of the feature flags in the advanced settings shows that most are non-functional. Several key flags are either unimplemented or broken. A critical bug on the Classic Battle page (`battleClassic.html`) blocks testing of UI-centric features. The settings UI also has opportunities for improved clarity, developer experience, and accessibility.

## 2. Critical Blockers

### Classic Battle Page is Unplayable
-   **Issue:** Navigating to `battleClassic.html` results in a broken page with a disabled "Next" button and no way to start a match.
-   **Impact:** This is a **critical bug** that blocks testing for `opponentDelayMessage`, `battleStateBadge`, `battleStateProgress`, and `skipRoundCooldown` in the classic UI.

## 3. Feature Flag Status

### Debug & Testing Flags

-   **`enableTestMode`**
    -   **Status:** 🔴 **Unimplemented**
    -   **Observations:** Enabling the flag has no visible effect. No "Test Mode Active" banner appears, and gameplay is unchanged.

-   **`enableCardInspector`**
    -   **Status:** 🔴 **Not Working**
    -   **Observations:** No collapsible panel for inspecting raw card JSON appears on any screen.

-   **`viewportSimulation`**
    -   **Status:** 🔴 **Unimplemented**
    -   **Observations:** The flag toggles, but no UI for device simulation appears.

-   **`tooltipOverlayDebug`**
    -   **Status:** 🔴 **Not Working**
    -   **Observations:** No debug outlines are shown when hovering over tooltips.

-   **`battleStateBadge`**
    -   **Status:** 🔴 **Unimplemented**
    -   **Observations:** No state badge appears in the battle header.

-   **`battleStateProgress`**
    -   **Status:** 🔴 **Not Working**
    -   **Observations:** The expected state sequence display beneath the battle area never appears.

### Gameplay & Engine Flags

-   **`skipRoundCooldown`**
    -   **Status:** 🔴 **Not Working**
    -   **Observations:** The `cooldown` state and associated delay persist in CLI battles even when this flag is enabled.

-   **`roundStore`**
    -   **Status:** 🟡 **No Observable Effect**
    -   **Observations:** Toggling the flag does not change behavior. Leaving and restarting a CLI match always resets the score. Its purpose is unclear.

-   **`opponentDelayMessage`**
    -   **Status:** ⚪ **Unable to Verify**
    -   **Observations:** The CLI has no corresponding UI element. Verification in Classic Battle is blocked by the broken page bug.

### Interaction Issues

-   **`statHotkeys` & `cliShortcuts`**
    -   **Status:** 🟡 **Interaction Issue**
    -   **Observations:** `statHotkeys` only function if `cliShortcuts` is also enabled. This coupling is not communicated to the user.

## 4. Recommendations & Fix Plan

### High-Priority Fixes
1.  **Fix Classic Battle:** Prioritize fixing the `battleClassic.html` page to unblock further QA on UI-related features.
2.  **Decouple Hotkeys:** Separate the logic for `statHotkeys` and `cliShortcuts` or combine them into a single, clear "Enable Hotkeys" flag.

### UI & UX Improvements
-   **Group Flags by Category:** Reorganize the settings page into logical sections:
    -   **Gameplay:** `statHotkeys`, `autoSelect`.
    -   **Debugging Tools:** `enableTestMode`, `cardInspector`, `layoutOutlines`, `verboseLogging`.
    -   **Experimental:** `viewportSimulation`, `battleStateBadge`, `roundStore`.
-   **Provide User Feedback:** For unimplemented flags, either disable the toggle or show a "Coming Soon" message to manage user expectations.
-   **Improve Accessibility:**
    -   Ensure consistent keyboard navigation and a visible focus indicator.
    -   Allow toggling via Space/Enter keys.
    -   Add `aria-label` attributes to each switch and announce state changes for screen readers.
-   **Surface Useful Flags:** Move gameplay enhancers like `statHotkeys` out of the advanced section to a more prominent location.

### Developer Experience & Testability
-   **Add Flag Metadata:** Extend `settings.json` to include `description`, `stability` (`alpha`, `beta`), `owner`, and `lastUpdated` fields for better lifecycle management.
-   **Expose `data-feature-*` Hooks:** Add unique data attributes to toggles and the UI elements they control to create reliable hooks for automated testing.
-   **Address Debug Performance:** Investigate the rendering jitter caused by `Layout Debug Outlines`. Consider a lighter-weight alternative, like outlining only on hover.