# # PRD: Settings Menu

---

## TL;DR

This PRD defines the Settings Menu for Ju-Do-Kon!, enabling players to control sound, motion effects, navigation map, display mode, and the visibility of certain game modes. These options improve accessibility, personalization, and retention by empowering users to tailor the game to their needs.

---

## Problem Statement

Players need to easily adjust game settings to personalize their experience, improve accessibility, and reduce frustration. Settings such as sound, motion effects, display mode, navigation map, and feature toggles exist to empower users to tailor the game to their needs, accommodate diverse preferences, and ensure the game is welcoming for all. Without a clear, responsive settings menu, players may struggle to find comfort, leading to early churn and reduced engagement.

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

| Priority | Feature                             | Description                                                                                            |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P1       | Sound Toggle                        | Binary toggle updating `settings.json` live on change.                                                 |
| P1       | Full Navigation Map Toggle          | Enable or disable the full navigation map via general setting; updates `settings.json` live on change. |
| P3       | Test Mode Feature Flag              | Enables deterministic battles for automated testing.                                                   |
| P3       | Battle Debug Panel Feature Flag     | Adds a collapsible debug `<pre>` beside the opponent's card showing match state.                       |
| P3       | Card Inspector Feature Flag         | Reveals a panel on each card with its raw JSON for debugging.                                          |
| P3       | Viewport Simulation Feature Flag    | Choose preset sizes to simulate different devices.                                                     |
| P3       | Tooltip Overlay Debug Feature Flag  | Outline tooltip targets to debug placement.                                                            |
| P3       | Layout Debug Outlines Feature Flag  | Show element outlines to inspect page layout.                                                          |
| P3       | Navigation Cache Reset Feature Flag | Add a button to clear cached navigation data.                                                          |
| P1       | Motion Effects Toggle               | Binary toggle updating `settings.json` live on change.                                                 |
| P1       | Typewriter Effect Toggle            | Enable or disable quote animation where supported (not used on the meditation screen).                 |
| P1       | Tooltips Toggle                     | Globally enable or disable UI tooltips.                                                                |
| P1       | Display Mode Switch                 | Three-option switch applying mode instantly across UI.                                                 |
| P2       | Game Modes Toggles                  | Binary toggles controlling pre-seeded links via `navigationItems.json`.                      |
| P3       | Settings Menu Integration           | Ensure settings appear as a game mode in `navigationItems.json`.                                       |
| P3       | View Change Log Link                | Link to `changeLog.html` for viewing recent judoka updates.                                            |
| P3       | View PRD Documents Link             | Link to `prdViewer.html` for browsing product requirement documents.                                   |
| P3       | View Design Mockups Link            | Link to `mockupViewer.html` to browse design mockups.                                                  |
| P3       | View Tooltip Descriptions Link      | Link to `tooltipViewer.html` for exploring tooltip text.                                               |
| P3       | Vector Search for RAG Link          | Link to `vectorSearch.html` for vector database queries.                                               |

---

### Settings API

Modules access player preferences via helpers in
`src/helpers/settingsUtils.js`:

- `getSetting(key)` – synchronous access to cached settings.

Feature flags are handled by `src/helpers/featureFlags.js`:

- `isEnabled(flag)` – check whether a flag is enabled.
- `setFlag(flag, value)` – persist a flag change and emit a `change` event via `featureFlagsEmitter`.

`loadSettings()` should run during startup to populate the cache, avoiding
direct `localStorage` reads throughout the app by using `src/helpers/storage.js`.
Pages should query `featureFlags.isEnabled` rather than reading
`settings.featureFlags` directly.

## Settings Features

- **Sound (binary):** ON/OFF (default: ON) – Enable or mute game audio.
- **Full navigation map (binary):** ON/OFF (default: ON) – Display an overlay map linking to every page.
- **Test mode feature flag (binary):** ON/OFF (default: OFF) – Run deterministic matches for testing.
- **Battle debug panel feature flag (binary):** ON/OFF (default: OFF) – Show a panel with live match data for debugging.
- **Card inspector feature flag (binary):** ON/OFF (default: OFF) – Reveal raw card JSON in a collapsible panel.
- **Viewport simulation feature flag (binary):** ON/OFF (default: OFF) – Choose preset sizes to simulate different devices.
- **Tooltip overlay debug feature flag (binary):** ON/OFF (default: OFF) – Outline tooltip targets to debug placement.
- **Layout debug outlines feature flag (binary):** ON/OFF (default: OFF) – Show element outlines to inspect page layout.
- **Navigation cache reset feature flag (binary):** ON/OFF (default: OFF) – Add a button to clear cached navigation data.
- **Motion effects (binary):** ON/OFF (default: ON) – Disable animations for a calmer interface.
- **Typewriter effect (binary):** ON/OFF (default: ON, not currently used on the meditation screen) – Toggle the quote typing animation.
- **Tooltips (binary):** ON/OFF (default: ON) – Show or hide helpful tooltips.
- **Display mode (three options):** Light, Dark, High Contrast (default: Light)
- **Game modes list:** Pre-seeded entries cross-referenced with `navigationItems.json` to determine order and visibility via CSS; each mode has a binary toggle.
- **View Change Log:** Link opens `changeLog.html` with the latest 20 judoka updates.
- **View PRD Documents:** Link opens `prdViewer.html` for browsing product documents.
- **View Design Mockups:** Link opens `mockupViewer.html` for viewing design mockups.
- **View Tooltip Descriptions:** Link opens `tooltipViewer.html` for exploring tooltip text.
- **Vector Search for RAG:** Link opens `vectorSearch.html` to explore the vector database.
- Links in this fieldset are arranged in a responsive three-column grid, collapsing to a single column below 768px.
- **Restore Defaults:** Button opens a confirmation modal to clear stored settings and reapply defaults.

---

## Technical Considerations

- All data reads/writes should use asynchronous, promise-based functions with error handling.
- `settings.json` must persist via the storage utility for session retention.
- Updates should debounce writes to avoid excessive file operations if toggles are changed rapidly.
- Wrap the page contents in a `.home-screen` container so the fixed header does not cover the first settings control.

---

## Data & Persistence

- The Settings page **must pull current states** from data sources (`settings.json`, `gameModes.json`, and `navigationItems.json`) on load, using the `navigationCache` helper for navigation persistence.
- Default feature flag values live in `settings.json`, while their labels and descriptions come from `tooltips.json`.
- `gameModes.json` defines all available modes, while `navigationItems.json` references each by `id` to control order and visibility via CSS.
- Changes should trigger **immediate data writes** without requiring a “Save Changes” button.
- All live updates must persist across page refreshes within the same session.
- If `navigationItems.json` fails to load, the game modes section should **disable gracefully** and show an error message.

---

## Acceptance Criteria Checklist

### Sound Toggle

- When the sound toggle is switched ON/OFF, the change is immediately reflected in `settings.json` within 50ms.
- Toggling sound updates the UI indicator (toggle visually reflects ON/OFF state).
- Toggling sound causes no console errors or JS exceptions.
- Sound setting persists across page refreshes and sessions.

### Show Card of the Day Toggle

- When the "Show Card of the Day" toggle is switched ON/OFF, the change is immediately reflected in `settings.json` within 50ms.
- Toggling updates the UI indicator and the Card of the Day display instantly.
- Setting persists across page refreshes and sessions.

### Full Navigation Map Setting

- Enabling or disabling the setting updates `settings.json` within 50ms.
- The toggle correctly reflects the current setting state in the UI.
- The navigation map is available only when the setting is enabled.
- Setting persists across page refreshes and sessions.

### Test Mode Feature Flag

- Enabling the flag displays a "Test Mode Active" banner on battle pages.
- Card draws and stat choices become deterministic for repeat tests.
- `data-test-mode="true"` appears on the battle area while active.
- Setting persists across page refreshes and sessions.

### Battle Debug Panel Feature Flag

- Enabling the flag shows a collapsible debug panel on battle pages.
- The panel displays real-time match state inside a `<pre>` element.
- The panel is keyboard accessible and hidden by default.
- The panel appears beside the opponent's card rather than at the page bottom.
- The panel stays visible for the whole match once enabled.
- Setting persists across page refreshes and sessions.

### Card Inspector Feature Flag

- Enabling the flag adds a collapsible panel on each card with its raw JSON.
- Opening the panel sets `data-inspector="true"` on the card.
- The inspector panel can be toggled via keyboard and is hidden initially.
- Setting persists across page refreshes and sessions.

### Motion Effects Toggle

- Switching motion ON/OFF updates `settings.json` live within 50ms.
- Motion effects on UI start or stop instantly (e.g., animations stop when OFF).
- UI toggle reflects the current motion setting accurately on page load.
- Setting persists across page refreshes and sessions.

### Typewriter Effect Toggle

- Toggle enables or disables the quote typewriter animation where implemented.
- Setting is stored in `settings.json` within 50ms of change.
- Setting persists across page refreshes and sessions.

### Display Mode Switch

- Selecting a new display mode (light/dark/high-contrast) applies changes instantly across all relevant UI components.
- Selected mode persists through a page refresh within the same session.
- Current display mode is correctly pulled from `settings.json` on page load.
- Transition to new display mode completes without visible flickering or rendering artifacts.
- Implementation uses the `applyDisplayMode` helper which sets a `data-theme` attribute on `<body>` so `base.css` variables can switch values per theme. Transitions use the View Transitions API, falling back to immediate changes if unsupported.

### Game Modes Toggles

- Toggling any game mode ON/OFF updates the IsHidden field in `settings.json` within 50ms.
- Each game mode toggle accurately reflects its state on page reload.
- If `navigationItems.json` is missing or invalid, the game modes list does not render, and an error message appears in the settings UI.
- Setting persists across page refreshes and sessions.

### Advanced Settings & Feature Flag Info

- Experimental and debug flags are grouped under an **Advanced Settings** section that remains visible to simplify testing.
- When a flag is toggled, a snackbar appears with text from `tooltips.json` keyed by `settings.<flagName>`.
- The snackbar confirms the change and hides itself after a short delay.
- Debug-focused flags remain tucked away so younger players do not accidentally enable them.
- Setting persists across page refreshes and sessions.

### Data Persistence & Refresh

- All settings changes persist through page refresh within the same session.
- Reopening `settings.html` shows the most up-to-date settings state from `settings.json`.

### Error Handling & Feedback

- If reading `settings.json` fails, a CSS popup error message appears within 200ms.
- If writing to `settings.json` fails, a CSS popup error message appears within 200ms, and the toggle/selector reverts to its previous state.
- The settings screen remains stable and usable if an error occurs (no frozen or unresponsive UI).
- Successful changes display a snackbar confirmation within 3 seconds.

### Accessibility & UX

- All toggles/selectors have keyboard focus indicators.
- Users can tab through all interactive elements in a logical order.
- Color contrast of text and controls meets WCAG 2.1 minimum (4.5:1) in all display modes.
- Touch targets meet or exceed a 44px minimum size (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- All settings, including feature flags, show a label and brief description using the same markup as the Advanced Settings section (see [Settings Item Structure](../codeStandards/settingsPageDesignGuidelines.md#settings-item-structure)).

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
  - **Section layout:** The page begins with an `h1` heading followed by two `fieldset` sections—**General Settings** and **Game Modes**—each using the `.game-mode-toggle-container` grid. The second fieldset keeps `id="game-mode-toggle-container"` so scripts can find it.
  - To simplify UI testing, all settings sections are displayed simultaneously.

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

The page begins with an `h1` heading labeled "Settings". Two `fieldset` sections follow—one for **General Settings** and one for **Game Modes**.

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
[ Light | Dark | High Contrast ] (default: Light)

───────────────────────────────  
| GAME MODES |  
| (Pre-seeded list; visibility and order driven by `navigationItems.json` via CSS) |
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
  - [ ] 2.2 Ensure smooth reflow for orientation changes.

- [ ] 3.0 Data Persistence & Error Handling

  - [ ] 3.1 Implement immediate data updates on setting change.
  - [ ] 3.2 Display CSS popup on read/write errors.
  - [ ] 3.3 Revert toggles/selectors on failed updates.

- [ ] 4.0 List Game Modes

    - [x] 4.1 Ensure game mode toggles map to pre-seeded links defined in `navigationItems.json`.
  - [x] 4.2 Display error message if loading fails.

- [ ] 6.0 Add Change Log Link
  - [x] 6.1 Link to `changeLog.html` from the Settings menu.
- [ ] 7.0 Add PRD Viewer Link
  - [x] 7.1 Link to `prdViewer.html` from the Settings menu.
- [ ] 8.0 Add Mockup Viewer Link
  - [x] 8.1 Link to `mockupViewer.html` from the Settings menu.
- [ ] 9.0 Add Tooltip Viewer Link
  - [x] 9.1 Link to `tooltipViewer.html` from the Settings menu.
- [ ] 10.0 Snackbar Feedback
  - [x] 10.1 Show a snackbar confirmation for every successful settings change (not just nav cache reset).
- [ ] 11.0 Accessibility & UX Audits
  - [ ] 11.1 Run Pa11y or equivalent accessibility audit on the settings page and resolve any issues.
  - [ ] 11.2 Verify all color contrast ratios meet WCAG 2.1 (4.5:1) in all display modes.
  - [ ] 11.3 Verify all touch targets are ≥44px and add Playwright tests if needed.
  - [ ] 11.4 Add Playwright UI tests for keyboard navigation and ARIA attributes.
- [ ] 12.0 Visual Regression
  - [ ] 12.1 Add Playwright screenshot tests for the settings page in all display modes.

---

[Back to Game Modes Overview](prdGameModes.md)
