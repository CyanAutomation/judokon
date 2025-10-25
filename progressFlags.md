# QA Report for `src/pages/settings.html`

## Verified Bug Reports

| Bug | Steps to Reproduce | Evidence | Verification Notes |
| --- | --- | --- | --- |
| **Card Inspector flag has no visible effect** | Enable **Card Inspector** on the settings page, then navigate to Classic Battle. Expectation from the PRD is that each judoka card shows a collapsible panel with the raw card JSON. No such panel appears under the cards. | After enabling the flag and playing a match, no JSON or collapsible inspector appears. | **Bug is real.** The `enableCardInspector` flag is not handled on the Classic Battle page. The bootstrap script for the page needs to be updated to read the flag and pass it to the `JudokaCard` component. |
| **Layout Debug Outlines persist across pages after disabling** | Toggle **Layout Debug Outlines** on (red dashed outlines appear) then off. Navigate to another page (e.g., Classic Battle or Select Match Length modal). The outlines persist on the new page even though the flag is off. | After turning off the flag on the settings page, the `Select Match Length` modal and battle UI still display red dashed outlines. | **Bug is real.** The `toggleLayoutDebugPanel` function is not called when the feature flag is changed, except on the settings page itself. A global listener is needed. |
| **Skip Round Cooldown doesn’t remove the cooldown** | Enable **Skip Round Cooldown** and start a Classic Battle. After selecting a stat, the game still enters a `cooldown` state. Round transitions are not instantaneous. | Even with the flag enabled, after choosing a stat the state becomes `cooldown` and a delay occurs. | **Bug is real.** The `startCooldown` function doesn't check for the `skipRoundCooldown` flag. It needs to be updated to skip the cooldown if the flag is enabled. |
| **Battle State Progress doesn’t update** | Turn on **Battle State Progress** and play a match. The row of numbers appears, but the highlighted number does not change as the state progresses (always shows `4`). | During multiple rounds the progress bar remained on position 4 despite state transitions. | **Bug is real.** The state machine appears to be stuck in the `roundDecision` state (ID 4), which prevents the progress bar from updating. The `battleStateChange` event is likely not firing correctly. |
| **CLI Shortcuts disabled leaves players with no clear way to select stats** | Disable **CLI Shortcuts** on the settings page and navigate to the battle CLI. The number keys no longer select stats. The CLI expects the user to type commands, but there is no instruction on the required syntax. | Pressing 1–5 in the CLI has no effect after disabling the shortcuts; the player must guess the command syntax. | **Bug is real.** This is a usability issue. The CLI should provide guidance when shortcuts are disabled. |
| **Opponent Delay Message appears only in the CLI, not in Classic Battle** | With the flag enabled, the CLI page shows “Opponent is choosing…” after a selection. In the Classic battle page this message never appears. | In Classic battle no “Opponent is choosing…” message is observed. | **Bug is real.** The Classic Battle UI does not implement the opponent delay message. |
| **Auto-Select triggers but still shows state progress stuck at the same number** | When the timer expires and auto-select picks a stat, the battle state progress bar still highlights the same number (4). | After auto-selecting a stat due to timer expiry, the progress indicator remains on 4. | **Bug is real.** This is a symptom of the "Battle State Progress doesn’t update" bug. |
| **Accessibility issues** | Navigating with Tab/Shift-Tab sometimes skips toggles or focuses on elements without visible outline. Screen readers read generic labels like “checkbox” rather than flag names. | Observed when tabbing through the advanced settings section. | **Bug is real.** The settings page has accessibility issues that need to be addressed. |
| **Performance impact of debug flags** | Enabling multiple debug flags noticeably slows down page rendering and introduces layout flickering. | When all debug flags were enabled, navigating to Classic Battle resulted in a noticeable lag and redrawn outlines. | **Bug is real.** The debug flags have a performance impact that should be mitigated. |

## Improvement Opportunities & Fix Plan

### 1. Group Flags into Categories

* **Opportunity:** The advanced settings page lists many flags with no grouping. Organizing flags under categories such as **Gameplay**, **Debugging**, **Accessibility**, or **CLI** would improve discoverability.
* **Fix Plan:**
  * Modify `src/pages/settings.html` to introduce category headers.
  * Update `src/helpers/settingsPage.js` to render flags under their respective categories.
  * Extend `src/data/settings.json` to include a `category` field for each flag.

### 2. Add Metadata to `settings.json`

* **Opportunity:** Extend each flag entry with metadata like `stabilityLevel` (e.g., `experimental`, `beta`, `stable`), `owner` (team responsible), `lastUpdated` timestamp, and `description`.
* **Fix Plan:**
  * Update the JSON schema for `src/data/settings.json`.
  * Add the new metadata fields to each flag in `settings.json`.
  * Update `src/helpers/settingsPage.js` to display this metadata in the UI.

### 3. Card Inspector Improvement

* **Opportunity:** The Card Inspector is not implemented in Classic Battle.
* **Fix Plan:**
  * In `src/helpers/classicBattle/bootstrap.js`, add a listener for the `featureFlagsEmitter` to toggle the card inspector.
  * Ensure the `enableCardInspector` flag is passed down to the `JudokaCard` component.
  * Consider adding a small "Inspect" icon to each card that expands to show the raw stats, as suggested in the original report.

### 4. Fix Layout Debug Outlines

* **Opportunity:** The layout debug outlines persist across pages after being disabled.
* **Fix Plan:**
  * In a globally loaded script like `src/helpers/setupDisplaySettings.js`, add a listener to `featureFlagsEmitter` that calls `toggleLayoutDebugPanel` when the `layoutDebugPanel` flag changes.

### 5. Fix Skip Round Cooldown

* **Opportunity:** The "Skip Round Cooldown" flag has no effect.
* **Fix Plan:**
  * In `src/helpers/classicBattle/roundManager.js`, modify the `startCooldown` function to check for the `skipRoundCooldown` flag.
  * If the flag is enabled, dispatch the `ready` event immediately to advance to the next round.

### 6. Fix Battle State Progress

* **Opportunity:** The battle state progress bar is stuck.
* **Fix Plan:**
  * Investigate why the `battleStateChange` event is not firing correctly in the `roundDecision` state.
  * The issue is likely in the state machine logic in `src/helpers/classicBattle/orchestrator.js` or one of its handlers.

### 7. Improve Accessibility

* **Opportunity:** The settings page has accessibility issues.
* **Fix Plan:**
  * Add proper ARIA labels to all toggles and controls.
  * Ensure all interactive elements have visible focus styles.
  * Use semantic HTML and accessible components.

## Config & Implementation Alignment Notes

* **Missing flag in UI:** The `roundStore` flag appears in `settings.json` but there is no toggle for it on the settings page. **Action:** Either remove it from the config or surface it with a description.
* **Hidden flags:** The ability to hide the entire advanced settings panel behind a collapsed accordion works, but there is no mention in the PRD of gating debug flags behind a role. **Action:** If non-developers should not see debug flags, consider reading a role from `localStorage` and hiding debug flags appropriately.
* **UI labelling:** Some flag names differ slightly from the PRD (e.g., “Battle State Badge” vs. PRD term “Battle State Indicator”). **Action:** Harmonize naming between the code, PRD, and UI to avoid confusion.
