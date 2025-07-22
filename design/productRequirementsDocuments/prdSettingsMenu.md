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

---

## Functional Requirements

| Priority | Feature                    | Description                                                                 |
| -------- | -------------------------- | --------------------------------------------------------------------------- |
| P1       | Sound Toggle               | Binary toggle updating `settings.json` live on change.                      |
| P1       | Full Navigation Map Toggle | Binary toggle updating `settings.json` live on change.                      |
| P1       | Motion Effects Toggle      | Binary toggle updating `settings.json` live on change.                      |
| P1       | Display Mode Selector      | Three-option selector applying mode instantly across UI.                    |
| P2       | Game Modes Toggles         | A list of all defined game modes with binary toggles from `gameModes.json`. |
| P3       | Settings Menu Integration  | Ensure settings appear as a game mode in `gameModes.json`.                  |
| P3       | Change Log Link           | Link to `changeLog.html` for viewing recent judoka updates.                 |

**Note:** For all settings items, if reading or writing to the data source fails, toggles/selectors **must revert** to their previous state, and a user-facing error should appear.

---

## Settings Features

- **Sound (binary):** ON/OFF (default: ON)
- **Full navigation map (binary):** ON/OFF (default: ON)
- **Motion effects (binary):** ON/OFF (default: ON)
- **Display mode (three options):** Light, Dark, Gray (default: Light)
  - _Gray mode_ provides a grayscale display to reduce visual noise for neurodivergent users.
- **Game modes list:** A list populated from `gameModes.json`, showing all modes defined there, with binary toggles per mode.
- **Change Log:** Link opens `changeLog.html` with the latest 20 judoka updates.

---

## Technical Considerations

- All data reads/writes should use asynchronous, promise-based functions with error handling.
- `settings.json` must persist in localStorage/sessionStorage for session retention.
- Updates should debounce writes to avoid excessive file operations if toggles are changed rapidly.
- Wrap the page contents in a `.home-screen` container so the fixed header does not cover the first settings control.

---

## Data & Persistence

- The Settings page **must pull current states** from data sources (`settings.json` and `gameModes.json`) on load.
- Changes should trigger **immediate data writes** without requiring a “Save Changes” button.
- All live updates must persist across page refreshes within the same session.
- If `gameModes.json` fails to load, the game modes section should **disable gracefully** and show an error message.

---

## Acceptance Criteria Checklist

### Sound Toggle

- AC-1.1 When the sound toggle is switched ON/OFF, the change is immediately reflected in `settings.json` within 50ms.
- AC-1.2 Toggling sound updates the UI indicator (toggle visually reflects ON/OFF state).
- AC-1.3 Toggling sound causes no console errors or JS exceptions.

### Full Navigation Map Toggle

- AC-2.1 When toggled ON/OFF, updates `settings.json` within 50ms.
- AC-2.2 Toggle correctly updates the UI indicator.
- AC-2.3 Navigation behavior updates immediately if functionality is active.

### Motion Effects Toggle

- AC-3.1 Switching motion ON/OFF updates `settings.json` live within 50ms.
- AC-3.2 Motion effects on UI start or stop instantly (e.g., animations stop when OFF).
- AC-3.3 UI toggle reflects the current motion setting accurately on page load.

### Display Mode Selector

- AC-4.1 Selecting a new display mode (light/dark/gray) applies changes instantly across all relevant UI components.
- AC-4.2 Selected mode persists through a page refresh within the same session.
- AC-4.3 Current display mode is correctly pulled from `settings.json` on page load.
- AC-4.4 Transition to new display mode completes without visible flickering or rendering artifacts.

### Game Modes Toggles

- AC-5.1 Toggling any game mode ON/OFF updates the IsHidden field in `settings.json` within 50ms.
- AC-5.2 Each game mode toggle accurately reflects its state on page reload.
- AC-5.3 If `gameModes.json` is missing or invalid, the game modes list does not render, and an error message appears in the settings UI.

### Data Persistence & Refresh

- AC-6.1 All settings changes persist through page refresh within the same session.
- AC-6.2 Reopening `settings.html` shows the most up-to-date settings state from `settings.json`.

### Error Handling & Feedback

- AC-7.1 If reading `settings.json` fails, a CSS popup error message appears within 200ms.
- AC-7.2 If writing to `settings.json` fails, a CSS popup error message appears within 200ms, and the toggle/selector reverts to its previous state.
- AC-7.3 The settings screen remains stable and usable if an error occurs (no frozen or unresponsive UI).

### Accessibility & UX

- AC-8.1 All toggles/selectors have keyboard focus indicators.
- AC-8.2 Users can tab through all interactive elements in a logical order.
- AC-8.3 Color contrast of text and controls meets WCAG 2.1 minimum (4.5:1) in all display modes.
- AC-8.4 Touch targets meet or exceed a 44px minimum size (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).

---

## Settings Menu: User Flow

- Player clicks “Settings” on the Navigation Bar or Navigation Map.
- Settings page loads in ≤200ms.
- Toggles/selectors pull values from settings.json and render current state.
- Player makes changes → UI updates instantly → data writes within 50ms.
- On error during update: Toggle reverts, then CSS popup error displayed
- Player exits → settings persist for the rest of the session.
- Player can open **Change Log** to view recent judoka updates.

---

## UX & Accessibility

- **Consistency:** Settings page must match the game’s visual identity, including fonts, colors, and button styles.
- **Touch targets:** All toggles and selectors must have touch targets ≥44px (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- **Accessibility:**
  - Keyboard navigation: All interactive elements must be reachable with tab, with clear focus indicators.
  - Screen reader support: Each toggle/selector must have appropriate ARIA labels describing function and current state.
  - Color contrast: Minimum 4.5:1 contrast ratio in all display modes per WCAG 2.1.
- **Interaction flow:**

  - Tab order should proceed top-to-bottom: **display mode → sound → nav map → motion → game mode toggles**.
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

  - [ ] 4.1 Load all game modes from `gameModes.json`.
  - [ ] 4.2 Display error message if loading fails.

- [ ] 5.0 Performance Optimization
  - [ ] 5.1 Profile settings page load times on mid-tier devices.
  - [ ] 5.2 Optimize for ≤200ms initial render.
- [ ] 6.0 Add Change Log Link
  - [ ] 6.1 Link to `changeLog.html` from the Settings menu.

---

        [Back to Game Modes Overview](prdGameModes.md)
