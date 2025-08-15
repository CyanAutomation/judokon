# Card Inspector PRD

## Problem Statement

Developers, QA testers, and advanced users need a fast, reliable way to inspect the raw JSON data behind each judoka card in JU-DO-KON! for debugging, validation, and troubleshooting. The current process of using browser dev tools is slow and error-prone, especially as card content and logic rapidly evolve. An in-game inspector panel will accelerate iteration, improve QA coverage, and reduce development friction.

## Goals

- Provide a toggleable inspector panel for all visible judoka cards
- Ensure inspector panel is non-intrusive and does not overlap gameplay elements
- Support real-time inspection of card data with minimal latency
- Enable advanced inspector functions (zoom, rotate card) for thorough data and UI validation
- Default inspector panel to OFF for all users

## Overview (TL;DR)

The **Card Inspector** is a developer/debugging utility in JU-DO-KON! that lets users view the raw JSON data behind each judoka card, directly within the game UI. It’s exposed via the `enableCardInspector` feature flag on the Settings page and is meant for QA, developers, and advanced users to inspect card data in real time.

---

## Problem Statement / Why It Matters

> “Right now, I have to open the browser dev tools and hunt for the card data in the DOM. It’s clunky and slows everything down.” – QA Tester

Developers and testers frequently need to verify the backend-bound data for each card to debug display issues, confirm game logic, or troubleshoot syncing problems. The current process — inspecting the DOM or logging to console — is slow, disruptive, and error-prone. These workarounds slow down development cycles and increase QA misses, especially as card content scales.

This problem is pressing because:

- Card attributes and logic are rapidly changing during playtesting.
- Iteration velocity is blocked by inefficient inspection tools.
- QA teams must validate hundreds of cards across devices.

---

## Goals / Success Metrics

- Toggle from the Settings page.
- JSON displayed for **100% of visible judoka cards**.
- Rendering adds minimal latency per card.
- No overlap with gameplay elements, controls, or animations.
- Inspector panel **defaults to OFF**

---

## User Stories

- **As a developer**, I want to see raw JSON data for each card so I can debug visual or logic inconsistencies.
- **As a QA tester**, I want to compare the card UI to backend data without needing browser tools.
- **As an advanced user**, I want insight into game data to understand card mechanics and report issues.

---

## Player Flow & Interaction

### Player Actions

1. Enable **Card Inspector** from the Settings page (Advanced → Feature Flags); the switch defaults to OFF.
2. **Judoka cards** will now show a collapsible JSON panel.
3. Each panel starts **collapsed** and can be expanded via a disclosure triangle (`<details>`).
4. Clicking outside a panel does not close it (explicit collapse required).
5. Opening the panel sets `data-inspector="true"` on the card container for styling.
6. Disabling the toggle **immediately hides** all JSON panels and removes the data attribute without reloading.

### Cancel/Exit Options

- Users can collapse individual panels using the disclosure widget.
- Turning off the toggle removes all inspector content instantly.

### Visual Feedback & Timing

- Panel expands/collapses with an ease-in animation.
- JSON is pretty-printed with 2-space indentation and syntax highlighting (if supported).
- Tapping/clicking the disclosure triangle (target size: 44×44px) toggles visibility.

---

## Acceptance Criteria

- Inspector toggle appears in Settings, labeled "Card Inspector", default OFF
- Enabling the toggle injects a collapsible JSON panel under each visible judoka card
- JSON panel is collapsed by default, pretty-prints card JSON, and supports syntax highlighting
- Inspector panel supports zoom and rotate card functions, accessible via UI controls
- Opening the panel sets `data-inspector="true"` on the card container; closing removes the attribute
- Inspector controls are keyboard-accessible and screen-reader-friendly
- Inspector panel never overlaps gameplay UI or interferes with card interactions
- Toggle state persists between sessions and updates UI without reload
- Error cases (invalid JSON, null card) show fallback message "Invalid card data"
- All inspector functions (expand/collapse, zoom, rotate) are covered by unit and Playwright tests

---

## Design / Visual UX Guidelines

- Content in **monospace font**, 12–14px.
- Disclosure widget uses system-native `<details>` or custom with WCAG labels.
- Tap target size for disclosure toggle: **44×44px minimum**.
- Smooth animation on expand/collapse.
- Fully responsive layout for tablet and desktop; mobile support optional.

---

## Accessibility Constraints

- Must support keyboard tabbing and screen reader hints (e.g., “Card Data: collapsed”).
- Error handling for malformed card data (`try/catch` around render).

---

## Edge Cases / Fallbacks

- **Corrupt Data**: Show “Invalid card data” message.
- **Malformed JSON**: Show error block, prevent crash.
- **Toggle Fails**: Log error, fallback to default OFF state.
- **Rendering Issues**: If panel glitches, allow QA console reset or hard reload.

---

## Dependencies

- `cardBuilder.js` and `renderJudokaCard()` logic.
- Shared user preferences for toggle persistence.

---

## Implementation Notes

Currently, the inspector activates only on pages wired to `toggleInspectorPanels`, including the main game, Classic Battle, and Random Judoka pages. Planned extensions will wire this feature into additional card-rendering views such as Team Battle and the Card Carousel.

---

## Tasks

- [x] 1.0 Implement Settings Toggle

  - [x] 1.1 Add "Card Inspector" toggle switch to `settings.html`
  - [x] 1.2 Set default state to OFF
  - [x] 1.3 Persist toggle in user settings
  - [x] 1.4 Reflect toggle state in UI immediately

- [x] 2.0 Render JSON Panel in Cards

  - [x] 2.1 Check for `toggle=true` in `cardBuilder.js`
  - [x] 2.2 Inject formatted JSON into each card
  - [x] 2.3 Use `<details>` for collapsibility with proper labeling
  - [x] 2.4 Set `data-inspector="true"` on open; remove on close

- [x] 3.0 Visual and Responsive Styling

  - [x] 3.1 Ensure 44px tap targets for disclosure toggle

- [ ] 4.0 Accessibility and Keyboard Support

  - [ ] 4.1 Add ARIA labels and keyboard controls
  - [ ] 4.2 Test with screen readers for all states
  - [ ] 4.3 Ensure tabbing through collapsed/expanded state works
  - [ ] 4.4 Finalize expand/collapse animation and run full accessibility tests

- [ ] 5.0 Error Handling

  - [ ] 5.1 Wrap rendering logic in `try/catch`
  - [ ] 5.2 Display fallback message for errors

---
