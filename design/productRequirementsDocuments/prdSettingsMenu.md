# PRD: Settings Menu

---

## TL;DR

This PRD defines the Settings Menu for Ju-Do-Kon!, enabling players to control sound, motion effects, navigation map, display mode, and the visibility of certain game modes. These options improve accessibility, personalization, and retention by empowering users to tailor the game to their needs.

---

## Problem Statement

As a user of the game _Ju-Do-Kon!_, I want to be able to change settings such as display mode, navigation map, motion effects, and sound, to tailor my experience and reduce frustration — especially for players sensitive to motion or needing visual adjustments. Playtesting shows **35% of users quit early when unable to adjust motion effects**, indicating the need for accessible, customizable gameplay.

> Kazuki, a player who’s prone to motion sickness, launches Ju-Do-Kon! for the first time. The opening animations make him dizzy, but he quickly finds the Settings Menu on the Judo Training Village Map. Within seconds, he toggles Motion Effects off — the UI instantly calms, and Kazuki can now enjoy battles without discomfort. By empowering players like Kazuki to control their experience, Ju-Do-Kon! becomes welcoming and inclusive.

---

## User Stories

- As a player sensitive to motion, I want to disable motion effects so I can play comfortably without nausea.
- As a player who prefers dark mode, I want to switch the display instantly so I’m not blinded in low light.
- As a parent, I want to turn off sound so my kids can play quietly.

---

## Goals

- Users experience an immediate reflection of setting changes in the UI, with updates to the data source completing within 50ms of interaction.
- All settings changes persist across page refreshes during the same session, ensuring a consistent user experience.
- When errors occur during reading or writing to `settings.json`, users see a clear CSS popup error message within 200ms, maintaining transparency and trust.
- The settings screen loads fully within 200ms on mid-tier devices (e.g., 2GB RAM smartphones), avoiding delays that could frustrate players.
- Allow players to personalize visual and audio experience to match their comfort.
- Provide immediate and persistent feedback when changing settings.
- Successful changes display a brief snackbar confirming the new state.

---

## Functional Requirements

| Priority | Feature                          | Description                                                                                         |
| -------- | -------------------------------- | ------------------------------------------------------------------- |
| P1       | Sound Toggle                     | Binary toggle updating `settings.json` live on change.                                              |
| P1       | Full Navigation Map Feature Flag | Enable or disable the full navigation map via feature flag; updates `settings.json` live on change. |
| P3       | Test Mode Feature Flag           | Enables deterministic battles for automated testing.                                                |
| P3       | Battle Debug Panel Feature Flag  | Adds a collapsible debug `<pre>` beside the opponent's card showing match state. |
| P3       | Card Inspector Feature Flag      | Reveals a panel on each card with its raw JSON for debugging.                                       |
| P1       | Motion Effects Toggle            | Binary toggle updating `settings.json` live on change.                                              |
| P1       | Typewriter Effect Toggle         | Enable or disable quote animation where supported (not used on the meditation screen). |
| P1       | Tooltips Toggle                  | Globally enable or disable UI tooltips.                                                             |
| P1       | Display Mode Switch              | Three-option switch applying mode instantly across UI.                                              |
| P2       | Game Modes Toggles               | A list of all defined game modes with binary toggles from `navigationItems.json`.                   |
| P3       | Settings Menu Integration        | Ensure settings appear as a game mode in `navigationItems.json`.                                    |
| P3       | Change Log Link                  | Link to `changeLog.html` for viewing recent judoka updates.                                         |
| P3       | PRD Viewer Link                  | Link to `prdViewer.html` for browsing product requirement documents.                                |
| P3       | Mockup Viewer Link               | Link to `mockupViewer.html` to browse design mockups.                                               |
| P3       | Tooltip Viewer Link              | Link to `tooltipViewer.html` for exploring tooltip text.                                            |
---

## Settings Features

- **Sound (binary):** ON/OFF (default: ON)
- **Full navigation map feature flag (binary):** ON/OFF (default: ON)
- **Test mode feature flag (binary):** ON/OFF (default: OFF)
- **Battle debug panel feature flag (binary):** ON/OFF (default: OFF)
- **Card inspector feature flag (binary):** ON/OFF (default: OFF)
- **Motion effects (binary):** ON/OFF (default: ON)
- **Typewriter effect (binary):** ON/OFF (default: ON, not currently used on the meditation screen)
- **Tooltips (binary):** ON/OFF (default: ON)
- **Display mode (three options):** Light, Dark, Gray (default: Light)
  - _Gray mode_ provides a grayscale display to reduce visual noise for neurodivergent users.
- **Game modes list:** Pulled from `gameModes.json` and cross-referenced with `navigationItems.json` to determine order and visibility; each mode has a binary toggle.
- **Change Log:** Link opens `changeLog.html` with the latest 20 judoka updates.
- **PRD Viewer:** Link opens `prdViewer.html` for browsing product documents.
- **Mockup Viewer:** Link opens `mockupViewer.html` for viewing design mockups.
- **Restore Defaults:** Button opens a confirmation modal to clear stored settings and reapply defaults.

---

## Technical Considerations

- All data reads/writes should use asynchronous, promise-based functions with error handling.
- `settings.json` must persist in localStorage/sessionStorage for session retention.
- Updates should debounce writes to avoid excessive file operations if toggles are changed rapidly.
- Wrap the page contents in a `.home-screen` container so the fixed header does not cover the first settings control.

---

## Data & Persistence

- The Settings page **must pull current states** from data sources (`settings.json`, `gameModes.json`, and `navigationItems.json`) on load.
- Default feature flag values live in `settings.json`, while their labels and descriptions come from `tooltips.json`.
- `gameModes.json` defines all available modes, while `navigationItems.json` references each by `id` to control order and hidden status.
- Changes should trigger **immediate data writes** without requiring a “Save Changes” button.
- All live updates must persist across page refreshes within the same session.
- If `navigationItems.json` fails to load, the game modes section should **disable gracefully** and show an error message.

---

## Acceptance Criteria Checklist

### Sound Toggle

- AC-1.1 When the sound toggle is switched ON/OFF, the change is immediately reflected in `settings.json` within 50ms.
- AC-1.2 Toggling sound updates the UI indicator (toggle visually reflects ON/OFF state).
- AC-1.3 Toggling sound causes no console errors or JS exceptions.

### Full Navigation Map Feature Flag

- AC-2.1 Enabling or disabling the flag updates `settings.json` within 50ms.
- AC-2.2 The toggle correctly reflects the current flag state in the UI.
- AC-2.3 The navigation map is available only when the flag is enabled.

### Test Mode Feature Flag

- AC-2.4 Enabling the flag displays a "Test Mode Active" banner on battle pages.
- AC-2.5 Card draws and stat choices become deterministic for repeat tests.
- AC-2.6 `data-test-mode="true"` appears on the battle area while active.

### Battle Debug Panel Feature Flag

- AC-2.7 Enabling the flag shows a collapsible debug panel on battle pages.
- AC-2.8 The panel displays real-time match state inside a `<pre>` element.
- AC-2.9 The panel is keyboard accessible and hidden by default.
- AC-2.10 The panel appears beside the opponent's card rather than at the page bottom.

### Card Inspector Feature Flag

- AC-2.11 Enabling the flag adds a collapsible panel on each card with its raw JSON.
- AC-2.12 Opening the panel sets `data-inspector="true"` on the card.
- AC-2.13 The inspector panel can be toggled via keyboard and is hidden initially.

### Motion Effects Toggle

- AC-3.1 Switching motion ON/OFF updates `settings.json` live within 50ms.
- AC-3.2 Motion effects on UI start or stop instantly (e.g., animations stop when OFF).
- AC-3.3 UI toggle reflects the current motion setting accurately on page load.

### Typewriter Effect Toggle

- AC-4.1 Toggle enables or disables the quote typewriter animation where implemented.
- AC-4.2 Setting is stored in `settings.json` within 50ms of change.

### Display Mode Switch

- AC-5.1 Selecting a new display mode (light/dark/gray) applies changes instantly across all relevant UI components.
- AC-4.2 Selected mode persists through a page refresh within the same session.
- AC-4.3 Current display mode is correctly pulled from `settings.json` on page load.
- AC-4.4 Transition to new display mode completes without visible flickering or rendering artifacts.
- Implementation uses the `applyDisplayMode` helper which sets a `data-theme` attribute on `<body>` so `base.css` variables can switch values per theme. Transitions use the View Transitions API, falling back to immediate changes if unsupported.

### Game Modes Toggles

- AC-5.1 Toggling any game mode ON/OFF updates the IsHidden field in `settings.json` within 50ms.
- AC-5.2 Each game mode toggle accurately reflects its state on page reload.
- AC-5.3 If `navigationItems.json` is missing or invalid, the game modes list does not render, and an error message appears in the settings UI.

### Advanced Settings & Feature Flag Info

- Experimental and debug flags are grouped under a collapsible **Advanced Settings** section.
- When a flag is toggled, a snackbar appears with text from `tooltips.json` keyed by `settings.<flagName>`.
- The snackbar confirms the change and hides itself after a short delay.
- Debug-focused flags remain tucked away so younger players do not accidentally enable them.

### Data Persistence & Refresh

- AC-6.1 All settings changes persist through page refresh within the same session.
- AC-6.2 Reopening `settings.html` shows the most up-to-date settings state from `settings.json`.

### Error Handling & Feedback

- AC-7.1 If reading `settings.json` fails, a CSS popup error message appears within 200ms.
- AC-7.2 If writing to `settings.json` fails, a CSS popup error message appears within 200ms, and the toggle/selector reverts to its previous state.
- AC-7.3 The settings screen remains stable and usable if an error occurs (no frozen or unresponsive UI).
- AC-7.4 Successful changes display a snackbar confirmation within 3 seconds.

### Accessibility & UX

- AC-8.1 All toggles/selectors have keyboard focus indicators.
- AC-8.2 Users can tab through all interactive elements in a logical order.
- AC-8.3 Color contrast of text and controls meets WCAG 2.1 minimum (4.5:1) in all display modes.
- AC-8.4 Touch targets meet or exceed a 44px minimum size (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- AC-8.5 All settings, including feature flags, show a label and brief description using the same markup as the Advanced Settings section (see [Settings Item Structure](../codeStandards/settingsPageDesignGuidelines.md#settings-item-structure)).

---

## Collapsible Settings Sections

To improve organization and reduce visual clutter, the Settings Menu should present each major area (e.g., General Settings, Game Modes) as a collapsible section. By default, all sections are collapsed; users can expand a section by clicking or using the keyboard. This approach supports accessibility, scalability, and a cleaner user experience as more settings are added.

### Functional Requirement

- Each settings area is collapsed by default and can be expanded/collapsed by the user.
- Section headers are keyboard-focusable and operable (Enter/Space).
- ARIA attributes (`aria-expanded`, `aria-controls`, `aria-labelledby`) are used for accessibility.
- Only expanded sections are included in the tab order.
- The implementation must meet all accessibility and performance requirements outlined elsewhere in this PRD.

### Acceptance Criteria

- AC-9.1 All settings areas are collapsed by default on page load.
- AC-9.2 Clicking or pressing Enter/Space on a section header toggles its expanded/collapsed state and updates `aria-expanded`.
- AC-9.3 When collapsed, section content is hidden from both view and tab order.
- AC-9.4 When expanded, section content is visible and all controls are accessible via keyboard and screen reader.
- AC-9.5 Section toggles and content meet touch target and color contrast requirements.

### Rationale

This pattern keeps the settings page organized and accessible, especially as more options are added. It also aligns with modern accessibility and responsive design standards.

---

## Settings Menu: User Flow

- Player clicks “Settings” on the Navigation Bar or Navigation Map.
- Settings page loads in ≤200ms.
- Toggles/selectors pull values from settings.json and render current state.
- Player makes changes → UI updates instantly → data writes within 50ms.
- On error during update: Toggle reverts, then CSS popup error displayed
- Player exits → settings persist for the rest of the session.
- Player can open **Change Log** to view recent judoka updates.
- Player can open **PRD Viewer** to read product requirement documents.
- Player can open **Mockup Viewer** to browse design mockups.
- The mockup viewer provides Next/Back controls for cycling through images and includes a Home link back to the main menu.

---

## UX & Accessibility

- **Consistency:** Settings page must match the game’s visual identity, including fonts, colors, and button styles.
- **Touch targets:** All toggles and selectors must have touch targets ≥44px (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- **Accessibility:**
  - Keyboard navigation: All interactive elements must be reachable with tab, with clear focus indicators.
  - Screen reader support: Each toggle/selector must have appropriate ARIA labels describing function and current state.
  - Color contrast: Minimum 4.5:1 contrast ratio in all display modes per WCAG 2.1.
- **Interaction flow:**

  - Tab order should proceed top-to-bottom: **display mode → sound → motion → game mode toggles**.
  - Users can navigate and activate each control without needing a mouse.
  - **Section layout:** The page begins with an `<h1>` heading followed by two `<fieldset>` sections—**General Settings** and **Game Modes**—each using the `.game-mode-toggle-container` grid. The second fieldset keeps `id="game-mode-toggle-container"` so scripts can find it.

  | **Settings Menu Mockup 1**                                         | **Settings Menu Mockup 2**                                         | **Settings Menu Mockup 2**                                         |
  | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
  | ![Settings Menu Mockup 1](/design/mockups/mockupGameSettings1.png) | ![Settings Menu Mockup 2](/design/mockups/mockupGameSettings2.png) | ![Settings Menu Mockup 3](/design/mockups/mockupGameSettings3.png) |

---

## Responsive Design Notes

- **Mobile-first layout:** Vertical stacking of controls for narrow screens (<600px wide).
- **Tablet & Desktop:** Side-by-side arrangement where space allows, maintaining touch target spacing.
- **Orientation handling:** Smoothly adapt when rotating devices; controls should reflow without overlap or cropping (**reflow <300 ms**).
- **Performance:** Animations or style transitions during setting changes must maintain ≥60fps on mid-tier devices.

---

## Wireframe

The page begins with an `<h1>` heading labeled "Settings". Two `<fieldset>` sections follow—one for **General Settings** and one for **Game Modes**.

───────────────────────────────  
| SETTINGS |  
| (settings.html) |  
───────────────────────────────

[ TOGGLE: SOUND ]  
[ ON | OFF ] (default: ON)

[ TOGGLE: FULL NAV MAP ]  
[ ON | OFF ] (default: ON)

[ TOGGLE: MOTION EFFECTS ]  
[ ON | OFF ] (default: ON)

[ SELECTOR: DISPLAY MODE ]  
[ Light | Dark | Gray ] (default: Light)

───────────────────────────────  
| GAME MODES |  
| (Dynamic list from JSON) |  
───────────────────────────────

[ Game Mode 1 ]  
[ ON | OFF ]

[ Game Mode 2 ]  
[ ON | OFF ]

[ Game Mode 3 ]  
[ ON | OFF ]

...

───────────────────────────────

---

## Tasks

- [ ] 1.0 Finalize UX & Accessibility

  - [ ] 1.1 Implement tab order and keyboard focus indicators.
  - [ ] 1.2 Add ARIA labels for all interactive elements.
  - [ ] 1.3 Confirm WCAG 2.1 compliance for color contrast.

- [ ] 2.0 Implement Responsive Layout

  - [ ] 2.1 Design and code mobile-first stacking of controls.
  - [ ] 2.2 Ensure smooth reflow for orientation changes (**<300 ms**).

- [ ] 3.0 Data Persistence & Error Handling

  - [ ] 3.1 Implement immediate data updates on setting change.
  - [ ] 3.2 Display CSS popup on read/write errors.
  - [ ] 3.3 Revert toggles/selectors on failed updates.

- [ ] 4.0 List Game Modes

  - [ ] 4.1 Load all game modes from `navigationItems.json`.
  - [ ] 4.2 Display error message if loading fails.

- [ ] 5.0 Performance Optimization
  - [ ] 5.1 Profile settings page load times on mid-tier devices.
  - [ ] 5.2 Optimize for ≤200ms initial render.
- [ ] 6.0 Add Change Log Link
  - [x] 6.1 Link to `changeLog.html` from the Settings menu.
- [ ] 7.0 Add PRD Viewer Link
  - [x] 7.1 Link to `prdViewer.html` from the Settings menu.
- [ ] 8.0 Add Mockup Viewer Link
  - [x] 8.1 Link to `mockupViewer.html` from the Settings menu.
- [ ] 9.0 Add Tooltip Viewer Link
  - [ ] 9.1 Link to `tooltipViewer.html` from the Settings menu.

---

        [Back to Game Modes Overview](prdGameModes.md)
