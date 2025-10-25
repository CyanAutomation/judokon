# QA Report: Settings & Feature Flags# QA Report: Settings & Feature Flags# QA Report for `src/pages/settings.html`



## Status Overview## Status Overview## Verified Bug Reports



This report documents verified issues with feature flags in the JU-DO-KON! application.This report documents verified issues with feature flags in the JU-DO-KON! application. **Most critical bugs have been fixed.** The table below summarizes current status with verification details.| Bug | Steps to Reproduce | Evidence | Verification Notes |

**Most critical bugs have been fixed.** The table below summarizes current status with

verification details.| --- | --- | --- | --- |



------| **Card Inspector flag has no visible effect** | Enable **Card Inspector** on the settings page, then navigate to Classic Battle. Expectation from the PRD is that each judoka card shows a collapsible panel with the raw card JSON. No such panel appears under the cards. | After enabling the flag and playing a match, no JSON or collapsible inspector appears. | **Bug is real.** The `enableCardInspector` flag is not handled on the Classic Battle page. The bootstrap script for the page needs to be updated to read the flag and pass it to the `JudokaCard` component. |



## Bug Verification & Status| **Layout Debug Outlines persist across pages after disabling** | Toggle **Layout Debug Outlines** on (red dashed outlines appear) then off. Navigate to another page (e.g., Classic Battle or Select Match Length modal). The outlines persist on the new page even though the flag is off. | After turning off the flag on the settings page, the `Select Match Length` modal and battle UI still display red dashed outlines. | **Bug is real.** The `toggleLayoutDebugPanel` function is not called when the feature flag is changed, except on the settings page itself. A global listener is needed. |



| Bug | Reproduction Steps | Evidence | Status | Notes |## Bug Verification & Status# QA Report: Settings & Feature Flags

| --- | --- | --- | --- | --- |

| **Card Inspector flag has no visible effect** | Enable **Card Inspector** on settings page, navigate to Classic Battle. Expect collapsible JSON panel under each card. | No JSON panel appears after enabling flag and playing a match. | ✅ **FIXED** | Flag properly propagated via `window.__FF_OVERRIDES`. Playwright tests exist in `battle-classic/feature-flags.spec.js` (line 207). || Bug | Reproduction Steps | Evidence | Status | Notes |## Status Overview

| **Layout Debug Outlines persist after disabling** | Toggle **Layout Debug Outlines** on (red dashed borders appear), toggle off, navigate to another page (Classic Battle). | Outlines persist on new pages despite flag being off. | ✅ **FIXED** | `toggleLayoutDebugPanel()` called in `settingsPage.js` (line 178) and `setupDisplaySettings.js` (line 26). Feature flag switches trigger properly. |

| **Skip Round Cooldown ineffective** | Enable **Skip Round Cooldown**, start Classic Battle, select a stat. Expect instantaneous state transition with no delay. | Game enters cooldown state despite flag being enabled. | ✅ **FIXED** | Implementation verified in `classicBattle/uiHelpers.js` (line 56) and `timerService.js` (line 476). CLI handles flag at `battleCLI/init.js` (line 2578). || --- | --- | --- | --- | --- |

| **Battle State Progress stuck at position 4** | Enable **Battle State Progress**, play a match. Progress indicator should update as state changes. | Progress bar remains at position 4 across multiple rounds. | ⚠️ **NEEDS VERIFICATION** | Code exists in `battleStateProgress.js` (line 231) with event listeners. Requires e2e testing to confirm. |

| **CLI Shortcuts disabled without guidance** | Disable **CLI Shortcuts** on settings page, navigate to battle CLI. Number keys should not select stats; user needs clear syntax guidance. | Keys 1–5 have no effect; no instructions provided. | ⚠️ **PARTIAL** | Flag properly implemented; CLI shows/hides shortcuts panel (`battleCLI/init.js`, lines 877–951). **TODO:** Add inline help text when shortcuts disabled. || **Card Inspector flag has no visible effect** | Enable **Card Inspector** on settings page → navigate to Classic Battle. Expect collapsible JSON panel under each card. | No JSON panel appears after enabling flag and playing a match. | ✅ **FIXED** | Flag is properly propagated via `window.__FF_OVERRIDES`. Playwright tests exist in `battle-classic/feature-flags.spec.js` (line 207). |This report documents verified issues with feature flags in the JU-DO-KON! application. **Most critical bugs have been fixed.** See [Implementation Status](#-implementation-status) below for detailed fix validation.

| **Opponent Delay Message only in CLI** | Enable **Opponent Delay Message**, in CLI see "Opponent is choosing…" after selection. In Classic Battle, message never appears. | Message shows in CLI but not in Classic Battle UI. | ✅ **FIXED** | Implementation verified in `battleClassic.init.js` (line 701) and `classicBattle/uiEventHandlers.js` (line 92). |

| **Auto-Select with Progress Stuck** | Enable **Auto-Select** and **Battle State Progress**, let timer expire to trigger auto-select. Progress indicator should update. | Progress bar remains on position 4 after auto-select. | ⚠️ **DEPENDENT** | Symptom of "Battle State Progress stuck" issue. Resolves when parent bug is fixed. || **Layout Debug Outlines persist after disabling** | Toggle **Layout Debug Outlines** on (red dashed borders appear) → toggle off → navigate to another page (e.g., Classic Battle). | Outlines persist on new pages despite flag being off. | ✅ **FIXED** | `toggleLayoutDebugPanel()` called in `settingsPage.js` (line 178) and `setupDisplaySettings.js` (line 26). Feature flag switches trigger properly (`featureFlagSwitches.js`, line 53). |

| **Settings Page Accessibility Issues** | Navigate with Tab/Shift-Tab through advanced settings section. Screen readers should read flag names clearly. | Tab skips toggles; screen readers read generic "checkbox" labels. | ❌ **OPEN** | Settings toggles need ARIA labels and visible focus indicators. |

| **Debug Flags Performance Impact** | Enable all debug flags, navigate to Classic Battle. Performance should be acceptable. | Noticeable lag and layout flickering observed. | ⚠️ **PARTIAL** | Layout flags use efficient selectors. Performance should be monitored in production. || **Skip Round Cooldown ineffective** | Enable **Skip Round Cooldown** → start Classic Battle → select a stat. Expect instantaneous state transition with no delay. | Game enters cooldown state despite flag being enabled. | ✅ **FIXED** | Implementation verified in `classicBattle/uiHelpers.js` (line 56) and `timerService.js` (line 476). CLI handles flag at `battleCLI/init.js` (line 2578). |---



---| **Battle State Progress stuck at "4"** | Enable **Battle State Progress** → play a match. Progress indicator should update as state changes. | Progress bar remains at position 4 across multiple rounds. | ⚠️ **NEEDS VERIFICATION** | Code exists in `battleStateProgress.js` (line 231) with event listeners. Requires e2e testing to confirm. |



## Implementation Status Details| **CLI Shortcuts disabled without guidance** | Disable **CLI Shortcuts** on settings page → navigate to battle CLI. Number keys should not select stats; user needs clear syntax guidance. | Keys 1–5 have no effect; no instructions provided. | ⚠️ **PARTIAL** | Flag properly implemented; CLI shows/hides shortcuts panel (`battleCLI/init.js`, lines 877–951). **TODO:** Add inline help text when shortcuts disabled. |## Verified Bug Reports



### ✅ Recently Fixed Issues| **Opponent Delay Message only in CLI** | Enable **Opponent Delay Message** → in CLI see "Opponent is choosing…" after selection. In Classic Battle, message never appears. | Message shows in CLI but not in Classic Battle UI. | ✅ **FIXED** | Implementation verified in `battleClassic.init.js` (line 701) and `classicBattle/uiEventHandlers.js` (line 92). |



#### Card Inspector| **Auto-Select with Progress Stuck** | Enable **Auto-Select** and **Battle State Progress** → let timer expire to trigger auto-select. Progress indicator should update. | Progress bar remains on position 4 after auto-select. | ⚠️ **DEPENDENT** | Symptom of "Battle State Progress stuck" issue. Resolves when parent bug is fixed. || Bug | Steps to Reproduce | Evidence | Status |



- **File:** `playwright/battle-classic/feature-flags.spec.js` (line 207)| **Settings Page Accessibility Issues** | Navigate with Tab/Shift-Tab through advanced settings section. Screen readers should read flag names clearly. | Tab skips toggles; screen readers read generic "checkbox" labels. | ❌ **OPEN** | Settings toggles need ARIA labels and visible focus indicators. See "Accessibility Improvements" section. || --- | --- | --- | --- |

- **Status:** Playwright tests confirm flag override works correctly on randomJudoka page

- **Verification:** Both enabled and disabled states tested| **Debug Flags Performance Impact** | Enable all debug flags → navigate to Classic Battle. Performance should be acceptable. | Noticeable lag and layout flickering observed. | ⚠️ **PARTIAL** | Layout flags use efficient selectors. Performance should be monitored in production. Consider lazy-loading debug UI. || **Card Inspector flag has no visible effect** | Enable **Card Inspector** on the settings page, then navigate to Classic Battle. Expectation from the PRD is that each judoka card shows a collapsible panel with the raw card JSON. No such panel appears under the cards. | After enabling the flag and playing a match, no JSON or collapsible inspector appears. | ✅ **FIXED** — Flag is now properly propagated via `window.__FF_OVERRIDES`. Tests exist in `playwright/battle-classic/feature-flags.spec.js` (line 207). |



#### Layout Debug Outlines| **Layout Debug Outlines persist across pages after disabling** | Toggle **Layout Debug Outlines** on (red dashed outlines appear) then off. Navigate to another page (e.g., Classic Battle or Select Match Length modal). The outlines persist on the new page even though the flag is off. | After turning off the flag on the settings page, the `Select Match Length` modal and battle UI still display red dashed outlines. | ✅ **FIXED** — `toggleLayoutDebugPanel()` is now called in `src/helpers/settingsPage.js` (line 178) and `src/helpers/setupDisplaySettings.js` (line 26). Feature flag switches properly trigger the toggle (`src/helpers/settings/featureFlagSwitches.js`, line 53). |



- **Files:**---| **Skip Round Cooldown doesn't remove the cooldown** | Enable **Skip Round Cooldown** and start a Classic Battle. After selecting a stat, the game should enter an instantaneous state with no cooldown delay. | When enabled, the cooldown should be skipped entirely. | ✅ **FIXED** — Implementation verified in `src/helpers/classicBattle/uiHelpers.js` (`skipRoundCooldownIfEnabled`, line 56) and `src/helpers/classicBattle/timerService.js` (line 476). CLI properly handles the flag at `src/pages/battleCLI/init.js` (line 2578). |

  - `src/helpers/settingsPage.js` (line 178)

  - `src/helpers/setupDisplaySettings.js` (line 26)| **Battle State Progress doesn't update** | Turn on **Battle State Progress** and play a match. The row of numbers appears, but the highlighted number does not change as the state progresses (always shows `4`). | During multiple rounds the progress bar remained on position 4 despite state transitions. | ⚠️ **NEEDS VERIFICATION** — Implementation exists in `src/helpers/battleStateProgress.js` (line 231) with event listeners configured. May be fixed but requires e2e test validation. |

  - `src/helpers/settings/featureFlagSwitches.js` (line 53)

- **Status:** Global toggle now properly synced across all pages## Implementation Status Details| **CLI Shortcuts disabled leaves players with no clear way to select stats** | Disable **CLI Shortcuts** on the settings page and navigate to the battle CLI. The number keys no longer select stats. The CLI expects the user to type commands, but there is no instruction on the required syntax. | Pressing 1–5 in the CLI has no effect after disabling the shortcuts; the player must guess the command syntax. | ✅ **PARTIALLY FIXED** — Flag is properly implemented. CLI now conditionally shows/hides the shortcuts panel (`src/pages/battleCLI/init.js`, lines 877–951). **Remaining:** Add inline help text when shortcuts are disabled. |

- **Mechanism:** Flag changes trigger `toggleLayoutDebugPanel()` immediately

| **Opponent Delay Message appears only in the CLI, not in Classic Battle** | With the flag enabled, the CLI page shows "Opponent is choosing…" after a selection. In the Classic battle page this message never appears. | In Classic battle no "Opponent is choosing…" message is observed. | ✅ **FIXED** — Implementation verified in `src/pages/battleClassic.init.js` (line 701) and `src/helpers/classicBattle/uiEventHandlers.js` (line 92). Both check for `opponentDelayMessage` flag. |

#### Skip Round Cooldown

### ✅ Recently Fixed Issues| **Auto-Select triggers but still shows state progress stuck at the same number** | When the timer expires and auto-select picks a stat, the battle state progress bar still highlights the same number (4). | After auto-selecting a stat due to timer expiry, the progress indicator remains on 4. | ⚠️ **NEEDS VERIFICATION** — This is a symptom of the "Battle State Progress doesn't update" bug. Depends on the resolution of that issue. |

- **Files:**

  - `src/helpers/classicBattle/uiHelpers.js` (line 56)| **Accessibility issues** | Navigating with Tab/Shift-Tab sometimes skips toggles or focuses on elements without visible outline. Screen readers read generic labels like "checkbox" rather than flag names. | Observed when tabbing through the advanced settings section. | ❌ **OPEN** — Settings toggles need ARIA labels and semantic HTML improvements. |

  - `src/helpers/classicBattle/timerService.js` (line 476)

  - `src/pages/battleCLI/init.js` (line 2578)#### Card Inspector| **Performance impact of debug flags** | Enabling multiple debug flags noticeably slows down page rendering and introduces layout flickering. | When all debug flags were enabled, navigating to Classic Battle resulted in a noticeable lag and redrawn outlines. | ⚠️ **PARTIAL** — Layout debug flags use efficient selectors. Performance should be monitored in production. Consider lazy-loading debug UI. |

- **Status:** Both Classic Battle and CLI modes properly check flag before applying cooldown

- **Verification:** CLI has URL parameter support (`?skipRoundCooldown=1`)| **Battle State Progress doesn’t update** | Turn on **Battle State Progress** and play a match. The row of numbers appears, but the highlighted number does not change as the state progresses (always shows `4`). | During multiple rounds the progress bar remained on position 4 despite state transitions. | **Bug is real.** The state machine appears to be stuck in the `roundDecision` state (ID 4), which prevents the progress bar from updating. The `battleStateChange` event is likely not firing correctly. |



#### Opponent Delay Message- **File:** `playwright/battle-classic/feature-flags.spec.js` (line 207)| **CLI Shortcuts disabled leaves players with no clear way to select stats** | Disable **CLI Shortcuts** on the settings page and navigate to the battle CLI. The number keys no longer select stats. The CLI expects the user to type commands, but there is no instruction on the required syntax. | Pressing 1–5 in the CLI has no effect after disabling the shortcuts; the player must guess the command syntax. | **Bug is real.** This is a usability issue. The CLI should provide guidance when shortcuts are disabled. |



- **Files:**- **Status:** Playwright tests confirm flag override works correctly on randomJudoka page| **Opponent Delay Message appears only in the CLI, not in Classic Battle** | With the flag enabled, the CLI page shows “Opponent is choosing…” after a selection. In the Classic battle page this message never appears. | In Classic battle no “Opponent is choosing…” message is observed. | **Bug is real.** The Classic Battle UI does not implement the opponent delay message. |

  - `src/pages/battleClassic.init.js` (line 701)

  - `src/helpers/classicBattle/uiEventHandlers.js` (line 92)- **Verification:** Both enabled and disabled states tested| **Auto-Select triggers but still shows state progress stuck at the same number** | When the timer expires and auto-select picks a stat, the battle state progress bar still highlights the same number (4). | After auto-selecting a stat due to timer expiry, the progress indicator remains on 4. | **Bug is real.** This is a symptom of the "Battle State Progress doesn’t update" bug. |

- **Status:** Both battle modes now display message when enabled

- **Verification:** Consistent implementation across UI layers| **Accessibility issues** | Navigating with Tab/Shift-Tab sometimes skips toggles or focuses on elements without visible outline. Screen readers read generic labels like “checkbox” rather than flag names. | Observed when tabbing through the advanced settings section. | **Bug is real.** The settings page has accessibility issues that need to be addressed. |



---#### Layout Debug Outlines| **Performance impact of debug flags** | Enabling multiple debug flags noticeably slows down page rendering and introduces layout flickering. | When all debug flags were enabled, navigating to Classic Battle resulted in a noticeable lag and redrawn outlines. | **Bug is real.** The debug flags have a performance impact that should be mitigated. |



## Outstanding Work- **Files:**## Improvement Opportunities & Fix Plan

  - `src/helpers/settingsPage.js` (line 178)

### 🔵 Issues Requiring Verification

  - `src/helpers/setupDisplaySettings.js` (line 26)### 1. Group Flags into Categories

#### Battle State Progress Not Updating

  - `src/helpers/settings/featureFlagSwitches.js` (line 53)

- **File:** `src/helpers/battleStateProgress.js` (line 231)

- **Investigation:** Event listeners configured in code. May already be fixed.- **Status:** Global toggle now properly synced across all pages\* **Opportunity:** The advanced settings page lists many flags with no grouping. Organizing flags under categories such as **Gameplay**, **Debugging**, **Accessibility**, or **CLI** would improve discoverability.

- **Action Required:**

  - [ ] Run Playwright test to confirm progress updates across states- **Mechanism:** Flag changes trigger `toggleLayoutDebugPanel()` immediately\* **Fix Plan:**

  - [ ] Verify `battleStateChange` event fires correctly  - Modify `src/pages/settings.html` to introduce category headers.

  - [ ] Check state machine doesn't get stuck in `roundDecision` (state ID 4)

#### Skip Round Cooldown \* Update `src/helpers/settingsPage.js` to render flags under their respective categories.

### 🟠 Partial Fixes

- Extend `src/data/settings.json` to include a `category` field for each flag.

#### CLI Shortcuts Disabled – No Guidance

* **Files:**

- **Current State:** Flag properly hides shortcuts panel  - `src/helpers/classicBattle/uiHelpers.js` (line 56)### 2. Add Metadata to `settings.json`

- **Remaining Work:** Add inline help message (e.g., in header or input placeholder)

- **Suggested UI:** "Use commands like `stat 1` or `stat 2` to select stats"  - `src/helpers/classicBattle/timerService.js` (line 476)

- **File:** `src/pages/battleCLI/init.js` (lines 929–951)

  - `src/pages/battleCLI/init.js` (line 2578)\* **Opportunity:** Extend each flag entry with metadata like `stabilityLevel` (e.g., `experimental`, `beta`, `stable`), `owner` (team responsible), `lastUpdated` timestamp, and `description`.

### 🔴 Open Issues

* **Status:** Both Classic Battle and CLI modes properly check flag before applying cooldown\* **Fix Plan:**

#### Settings Page Accessibility

* **Verification:** CLI has URL parameter support (`?skipRoundCooldown=1`) \* Update the JSON schema for `src/data/settings.json`.

- **Problem Areas:**  - Add the new metadata fields to each flag in `settings.json`.

  - No ARIA labels on toggle switches

  - Screen readers read generic "checkbox" instead of flag names#### Opponent Delay Message \* Update `src/helpers/settingsPage.js` to display this metadata in the UI.

  - Tab order may skip some toggles

  - Focus indicators not visible- **Files:**### 3. Card Inspector Improvement

- **Recommended Fixes:**  - `src/pages/battleClassic.init.js` (line 701)

  - Add `aria-label` to each toggle: `"Toggle [Flag Name] setting"`

  - Add visible focus outline (`:focus-visible`)  - `src/helpers/classicBattle/uiEventHandlers.js` (line 92)\* **Opportunity:** The Card Inspector is not implemented in Classic Battle.

  - Use semantic `<label>` elements connected to toggles via `for` attribute

  - Test with screen reader (NVDA or JAWS)- **Status:** Both battle modes now display message when enabled\* **Fix Plan:**

- **File to Update:** `src/helpers/settingsPage.js`

- **Verification:** Consistent implementation across UI layers \* In `src/helpers/classicBattle/bootstrap.js`, add a listener for the `featureFlagsEmitter` to toggle the card inspector.

#### Debug Flags Performance  - Ensure the `enableCardInspector` flag is passed down to the `JudokaCard` component.



- **Current Status:** Layout debug flags use efficient selectors--- \* Consider adding a small "Inspect" icon to each card that expands to show the raw stats, as suggested in the original report.

- **Recommendation:** Monitor in production; consider lazy-loading if performance degrades

- **Future Optimization:** Move debug UI rendering to separate thread/worker if needed## Outstanding Work### 4. Fix Layout Debug Outlines



---### 🔵 Issues Requiring Verification\* **Opportunity:** The layout debug outlines persist across pages after being disabled.



## Configuration Notes- **Fix Plan:**



### Missing or Hidden Flags#### Battle State Progress Not Updating \* In a globally loaded script like `src/helpers/setupDisplaySettings.js`, add a listener to `featureFlagsEmitter` that calls `toggleLayoutDebugPanel` when the `layoutDebugPanel` flag changes.



**`roundStore` flag:**- **File:** `src/helpers/battleStateProgress.js` (line 231)### 5. Fix Skip Round Cooldown



- Appears in `src/data/settings.json` but marked as `hidden: true`- **Investigation:** Event listeners configured in code. May already be fixed.

- No UI toggle exists for this flag

- **Clarification Needed:** Is this intentional? Should it be surfaced or removed from schema?- **Action Required:\*** **Opportunity:** The "Skip Round Cooldown" flag has no effect.

  - [ ] Run Playwright test to confirm progress updates across states\* **Fix Plan:**

### Naming Inconsistencies

  - [ ] Verify `battleStateChange` event fires correctly \* In `src/helpers/classicBattle/roundManager.js`, modify the `startCooldown` function to check for the `skipRoundCooldown` flag.

Current code uses these terms:

  - [ ] Check state machine doesn't stuck in `roundDecision` (state ID 4) \* If the flag is enabled, dispatch the `ready` event immediately to advance to the next round.

- `layoutDebugPanel` (code)

- `battleStateBadge` (code) vs. "Battle State Indicator" (PRD)### 🟠 Partial Fixes### 6. Fix Battle State Progress

- `battleStateProgress` (code)

#### CLI Shortcuts Disabled – No Guidance\* **Opportunity:** The battle state progress bar is stuck.

**Recommendation:** Harmonize terminology across code, PRD, and UI labels to reduce confusion.

- **Fix Plan:**

---

* **Current State:** Flag properly hides shortcuts panel \* Investigate why the `battleStateChange` event is not firing correctly in the `roundDecision` state.

## Recommended Improvements

* **Remaining Work:** Add inline help message (e.g., in header or input placeholder) \* The issue is likely in the state machine logic in `src/helpers/classicBattle/orchestrator.js` or one of its handlers.

### 1. 🏷️ Group Flags by Category

* **Suggested UI:** "Use commands like `stat 1` or `stat 2` to select stats"

**Opportunity:** Advanced settings page lists many flags without organization.

* **File:** `src/pages/battleCLI/init.js` (lines 929–951)### 7. Improve Accessibility

**Implementation:**

### 🔴 Open Issues\* **Opportunity:** The settings page has accessibility issues.

- Add `category` field to each flag in `src/data/settings.json`

- Categories: `gameplay`, `debug`, `accessibility`, `cli`- **Fix Plan:**

- Update `src/helpers/settingsPage.js` to render grouped sections

- Example schema:#### Settings Page Accessibility \* Add proper ARIA labels to all toggles and controls.



```json- Ensure all interactive elements have visible focus styles.

{

  "enableCardInspector": {* **Problem Areas:** \* Use semantic HTML and accessible components.

    "enabled": false,  - No ARIA labels on toggle switches

    "category": "debug",

    "tooltipId": "settings.enableCardInspector"  - Screen readers read generic "checkbox" instead of flag names## Config & Implementation Alignment Notes

  }

}  - Tab order may skip some toggles

```

  - Focus indicators not visible\* **Missing flag in UI:** The `roundStore` flag appears in `settings.json` but there is no toggle for it on the settings page. **Action:** Either remove it from the config or surface it with a description.

### 2. 📋 Add Metadata to Settings Schema

* **Recommended Fixes:\*** **Hidden flags:** The ability to hide the entire advanced settings panel behind a collapsed accordion works, but there is no mention in the PRD of gating debug flags behind a role. **Action:** If non-developers should not see debug flags, consider reading a role from `localStorage` and hiding debug flags appropriately.

**Opportunity:** Extend flag entries with rich metadata.  - Add `aria-label` to each toggle: `"Toggle [Flag Name] setting"`\* **UI labelling:** Some flag names differ slightly from the PRD (e.g., “Battle State Badge” vs. PRD term “Battle State Indicator”). **Action:** Harmonize naming between the code, PRD, and UI to avoid confusion.



**Implementation:**  - Add visible focus outline (`:focus-visible`)

  - Use semantic `<label>` elements connected to toggles via `for` attribute

- Add fields: `stabilityLevel`, `owner`, `lastUpdated`, `description`  - Test with screen reader (NVDA or JAWS)

- Display metadata badges (e.g., "EXPERIMENTAL", "BETA")

- Example schema:* **File to Update:** `src/helpers/settingsPage.js`



```json#### Debug Flags Performance

{

  "enableCardInspector": {- **Current Status:** Layout debug flags use efficient selectors

    "enabled": false,- **Recommendation:** Monitor in production; consider lazy-loading if performance degrades

    "stabilityLevel": "beta",- **Future Optimization:** Move debug UI rendering to separate thread/worker if needed

    "owner": "UI Team",

    "description": "Shows raw card JSON in expandable panel"---

  }

}## Configuration Notes

```

### Missing or Hidden Flags

### 3. ♿ Improve Accessibility

**`roundStore` flag:**

**Opportunity:** Settings toggles lack proper semantic markup and labels.

- Appears in `src/data/settings.json` but marked as `hidden: true`

**Implementation:**- No UI toggle exists for this flag

- **Clarification Needed:** Is this intentional? Should it be surfaced or removed from schema?

- Add `aria-label` to all toggles

- Ensure visible `:focus-visible` styles### Naming Inconsistencies

- Use `<label>` elements with `for` attribute

- Test with screen readers before deploymentCurrent code uses these terms:



### 4. 🎯 Add Feature Flag Help System- `layoutDebugPanel` (code)

- `battleStateBadge` (code) vs. "Battle State Indicator" (PRD)

**Opportunity:** Help players understand what each flag does without PRD.- `battleStateProgress` (code)



**Implementation:****Recommendation:** Harmonize terminology across code, PRD, and UI labels to reduce confusion.



- Add expandable help icon next to each flag---

- Show rich descriptions with examples

- Link to relevant documentation## Recommended Improvements

- Highlight "experimental" flags with warning badge

### 1. 🏷️ Group Flags by Category

### 5. 🔒 Role-Based Flag Visibility

**Opportunity:** Advanced settings page lists many flags without organization.

**Opportunity:** Hide debug flags from non-developers if desired.

**Implementation:**

**Implementation:**

- Add `category` field to each flag in `src/data/settings.json`

- Read `role` from `localStorage`- Categories: `gameplay`, `debug`, `accessibility`, `cli`

- Filter debug flags when rendering- Update `src/helpers/settingsPage.js` to render grouped sections

- Example roles: `player`, `developer`, `admin`- Example categories:

  ```json

---  {

    "enableCardInspector": {

## Verification Checklist      "enabled": false,

      "category": "debug",

Before marking as resolved:      "tooltipId": "settings.enableCardInspector"

    }

- [ ] **Card Inspector:** Playwright test passes (`feature-flags.spec.js`)  }

- [ ] **Layout Debug:** Toggle on/off on Settings page, verify persists on other pages  ```

- [ ] **Skip Cooldown:** Enable flag, play battle, stat selection is instant

- [ ] **Battle Progress:** Enable flag, play match, progress bar updates each state change### 2. 📋 Add Metadata to Settings Schema

- [ ] **CLI Shortcuts:** Disable flag, navigate to CLI, help text appears

- [ ] **Opponent Delay:** Enable flag, both Classic & CLI show "Opponent is choosing…"**Opportunity:** Extend flag entries with rich metadata.

- [ ] **Accessibility:** Tab through settings, all toggles reachable, screen reader reads flag names

- [ ] **Performance:** Enable all debug flags, no noticeable lag in Classic Battle**Implementation:**



---- Add fields: `stabilityLevel`, `owner`, `lastUpdated`, `description`

- Display metadata badges (e.g., "EXPERIMENTAL", "BETA")

## References- Example:

  ```json

- **Settings Data:** `src/data/settings.json`  {

- **Settings Defaults:** `src/config/settingsDefaults.js`    "enableCardInspector": {

- **Settings Page:** `src/helpers/settingsPage.js`      "enabled": false,

- **Battle Classic:** `src/pages/battleClassic.init.js`      "stabilityLevel": "beta",

- **Battle CLI:** `src/pages/battleCLI/init.js`      "owner": "UI Team",

- **Feature Flags Tests:** `playwright/battle-classic/feature-flags.spec.js`      "description": "Shows raw card JSON in expandable panel"

    }
  }
  ```

### 3. ♿ Improve Accessibility

**Opportunity:** Settings toggles lack proper semantic markup and labels.

**Implementation:**

- Add `aria-label` to all toggles
- Ensure visible `:focus-visible` styles
- Use `<label>` elements with `for` attribute
- Test with screen readers before deployment

### 4. 🎯 Add Feature Flag Help System

**Opportunity:** Help players understand what each flag does without PRD.

**Implementation:**

- Add expandable help icon next to each flag
- Show rich descriptions with examples
- Link to relevant documentation
- Highlight "experimental" flags with warning badge

### 5. 🔒 Role-Based Flag Visibility

**Opportunity:** Hide debug flags from non-developers if desired.

**Implementation:**

- Read `role` from `localStorage`
- Filter debug flags when rendering
- Example roles: `player`, `developer`, `admin`

---

## Verification Checklist

Before marking as resolved:

- [ ] **Card Inspector:** Playwright test passes (`feature-flags.spec.js`)
- [ ] **Layout Debug:** Toggle on/off on Settings page → verify persists on other pages
- [ ] **Skip Cooldown:** Enable flag → play battle → stat selection is instant
- [ ] **Battle Progress:** Enable flag → play match → progress bar updates each state change
- [ ] **CLI Shortcuts:** Disable flag → navigate to CLI → help text appears
- [ ] **Opponent Delay:** Enable flag → both Classic & CLI show "Opponent is choosing…"
- [ ] **Accessibility:** Tab through settings → all toggles reachable → screen reader reads flag names
- [ ] **Performance:** Enable all debug flags → no noticeable lag in Classic Battle

---

## References

- **Settings Data:** `src/data/settings.json`
- **Settings Defaults:** `src/config/settingsDefaults.js`
- **Settings Page:** `src/helpers/settingsPage.js`
- **Battle Classic:** `src/pages/battleClassic.init.js`
- **Battle CLI:** `src/pages/battleCLI/init.js`
- **Feature Flags Tests:** `playwright/battle-classic/feature-flags.spec.js`
