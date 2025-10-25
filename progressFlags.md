# QA Report: Settings & Feature Flags

## Status Overview

This report documents verified issues with feature flags in the JU-DO-KON! application.
Most critical bugs have been fixed. Current status with verification details is shown below.

---

## Bug Verification Status

| Bug | Reproduction | Evidence | Status | Notes |
|---|---|---|---|---|
| Card Inspector flag ineffective | Enable Card Inspector, navigate to Classic Battle, check for collapsible JSON panel | No JSON panel appears | ✅ FIXED | Flag propagated via `window.__FF_OVERRIDES`. Tests in `battle-classic/feature-flags.spec.js:207` |
| Layout Debug Outlines persist | Toggle outlines on/off, navigate to different page | Outlines remain on new pages | ✅ FIXED | `toggleLayoutDebugPanel()` synced in `settingsPage.js:178` and `setupDisplaySettings.js:26` |
| Skip Round Cooldown ineffective | Enable flag, play battle, select stat | Cooldown still applies | ✅ FIXED | Implementation in `classicBattle/uiHelpers.js:56` and `timerService.js:476` |
| Battle State Progress stuck | Enable flag, play match, observe progress bar | Stays at position 4 | ⚠️ VERIFY | Code exists in `battleStateProgress.js:231`, needs e2e test validation |
| CLI Shortcuts no guidance | Disable flag, try number keys in CLI | Keys 1-5 fail silently | ⚠️ PARTIAL | Flag works, CLI hides panel. Add help text. |
| Opponent Delay only in CLI | Enable flag, check both battle modes | Shows in CLI only | ✅ FIXED | Implemented in `battleClassic.init.js:701` and `uiEventHandlers.js:92` |
| Auto-Select Progress stuck | Enable both flags, let timer expire | Progress bar stuck at 4 | ⚠️ DEPENDENT | Blocked by Battle State Progress bug |
| Settings Accessibility broken | Tab through settings, use screen reader | Generic labels, skipped elements | ❌ OPEN | Needs ARIA labels, focus styles, semantic HTML |
| Debug Flags slow | Enable all flags, navigate | Noticeable lag, flickering | ⚠️ PARTIAL | Monitor in production, consider lazy-loading |

---

## Fixed Issues - Implementation Details

### ✅ Card Inspector

- **File:** `playwright/battle-classic/feature-flags.spec.js:207`
- **Status:** Playwright tests confirm flag override works on randomJudoka page
- **Verification:** Both enabled and disabled states tested

### ✅ Layout Debug Outlines

- **Files:** `settingsPage.js:178`, `setupDisplaySettings.js:26`, `featureFlagSwitches.js:53`
- **Status:** Global toggle properly synced across all pages
- **Mechanism:** Flag changes trigger `toggleLayoutDebugPanel()` immediately

### ✅ Skip Round Cooldown

- **Files:** `classicBattle/uiHelpers.js:56`, `timerService.js:476`, `battleCLI/init.js:2578`
- **Status:** Both Classic Battle and CLI properly check flag before applying cooldown
- **Verification:** CLI supports URL parameter `?skipRoundCooldown=1`

### ✅ Opponent Delay Message

- **Files:** `battleClassic.init.js:701`, `classicBattle/uiEventHandlers.js:92`
- **Status:** Both battle modes display message when enabled
- **Verification:** Consistent across UI layers

---

## Outstanding Issues

### 🔵 Needs Verification

#### Battle State Progress Not Updating

- **File:** `src/helpers/battleStateProgress.js:231`
- **Investigation:** Event listeners configured. May be fixed already.
- **Action Required:**
  - Run Playwright test to confirm progress updates across states
  - Verify `battleStateChange` event fires correctly
  - Check state machine doesn't get stuck in `roundDecision` (ID 4)

### 🟠 Partial Fixes

#### CLI Shortcuts Disabled – No Guidance

- **Current:** Flag properly hides shortcuts panel
- **Remaining:** Add inline help message in header or input placeholder
- **Suggested Text:** "Use commands like `stat 1` or `stat 2` to select stats"
- **File:** `src/pages/battleCLI/init.js:929-951`

### 🔴 Open Issues

#### Settings Page Accessibility

- **Problem Areas:**
  - No ARIA labels on toggles
  - Screen readers read generic "checkbox" instead of flag names
  - Tab order may skip toggles
  - No visible focus indicators
- **Recommended Fixes:**
  - Add `aria-label="Toggle [Flag Name] setting"` to each toggle
  - Add visible `:focus-visible` outline
  - Use semantic `<label>` elements with `for` attribute
  - Test with screen reader (NVDA or JAWS)
- **File:** `src/helpers/settingsPage.js`

#### Debug Flags Performance

- **Current:** Layout flags use efficient selectors
- **Recommendation:** Monitor in production; consider lazy-loading if needed
- **Future:** Move debug UI to separate thread if performance degrades further

---

## Configuration Notes

### Hidden Flag

`roundStore` flag appears in `src/data/settings.json` marked `hidden: true` with no UI toggle.

**Clarification needed:** Intentional? Should it be surfaced or removed?

### Naming Inconsistencies

- `layoutDebugPanel` (code) vs PRD terminology
- `battleStateBadge` (code) vs "Battle State Indicator" (PRD)
- `battleStateProgress` (code)

**Recommendation:** Harmonize terms across code, PRD, and UI labels.

---

## Recommended Improvements

### 1. Group Flags by Category

**Opportunity:** Settings page lists many flags without organization.

**Implementation:**

- Add `category` field to `src/data/settings.json`
- Categories: gameplay, debug, accessibility, cli
- Update `src/helpers/settingsPage.js` to render grouped sections

Example JSON schema:

```json
{
  "enableCardInspector": {
    "enabled": false,
    "category": "debug",
    "tooltipId": "settings.enableCardInspector"
  }
}
```

### 2. Add Rich Metadata

**Opportunity:** Extend flags with useful metadata.

**Implementation:**

- Add `stabilityLevel` (experimental, beta, stable)
- Add `owner` (responsible team)
- Add `description` (user-friendly text)
- Display metadata badges

Example JSON schema:

```json
{
  "enableCardInspector": {
    "enabled": false,
    "stabilityLevel": "beta",
    "owner": "UI Team",
    "description": "Shows raw card JSON in expandable panel"
  }
}
```

### 3. Improve Accessibility

**Opportunity:** Settings toggles need semantic markup.

**Implementation:**

- Add `aria-label` to all toggles
- Ensure visible `:focus-visible` styles
- Use `<label>` elements with `for` attribute
- Test with screen readers

### 4. Add Help System

**Opportunity:** Players don't understand what flags do without PRD.

**Implementation:**

- Add expandable help icon next to each flag
- Show rich descriptions with examples
- Link to documentation
- Highlight experimental flags with warning

### 5. Role-Based Visibility

**Opportunity:** Hide debug flags from non-developers.

**Implementation:**

- Read `role` from `localStorage`
- Filter debug flags when rendering
- Roles: player, developer, admin

---

## Verification Checklist

Before marking as complete:

- [ ] Card Inspector: Playwright tests pass
- [ ] Layout Debug: Toggle on/off on Settings, verify persists across pages
- [ ] Skip Cooldown: Enable, play battle, stat selection is instant
- [ ] Battle Progress: Enable, play match, progress bar updates each state
- [ ] CLI Shortcuts: Disable, navigate to CLI, help text appears
- [ ] Opponent Delay: Enable, both Classic & CLI show "Opponent is choosing…"
- [ ] Accessibility: Tab through settings, all reachable, screen reader reads names
- [ ] Performance: Enable all debug flags, no lag in Classic Battle

---

## References

- Settings Data: `src/data/settings.json`
- Settings Defaults: `src/config/settingsDefaults.js`
- Settings Page: `src/helpers/settingsPage.js`
- Battle Classic: `src/pages/battleClassic.init.js`
- Battle CLI: `src/pages/battleCLI/init.js`
- Feature Flags Tests: `playwright/battle-classic/feature-flags.spec.js`
