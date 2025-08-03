# Card Inspector PRD

## Overview (TL;DR)

The **Card Inspector** is a developer/debugging utility in JU-DO-KON! that lets users view the raw JSON data behind each judoka card, directly within the game UI. It’s toggled from the Settings page and is meant for QA, developers, and advanced users to inspect card data in real-time, without interrupting the core gameplay experience.

---

## Problem Statement / Why It Matters

> “Right now, I have to open the browser dev tools and hunt for the card data in the DOM. It’s clunky and slows everything down.” – QA Tester

Developers and testers frequently need to verify the backend-bound data for each card to debug display issues, confirm game logic, or troubleshoot syncing problems. The current process — inspecting the DOM or logging to console — is slow, disruptive, and error-prone. These workarounds slow down development cycles and increase QA misses, especially as card content scales.

This problem is urgent because:
- Card attributes and logic are rapidly changing during playtesting.
- Iteration velocity is blocked by inefficient inspection tools.
- QA teams must validate hundreds of cards across devices.

---

## Goals / Success Metrics

- Toggle from the Settings page.
- JSON displayed for **100% of visible judoka cards**.
- Rendering adds minimal latency per card.
- No overlap with gameplay elements, controls, or animations.
- Inspector panel **defaults to OFF**, even in devMode.

---

## User Stories

- **As a developer**, I want to see raw JSON data for each card so I can debug visual or logic inconsistencies.
- **As a QA tester**, I want to compare the card UI to backend data without needing browser tools.
- **As an advanced user**, I want insight into game data to understand card mechanics and report issues.

---

## Player Flow & Interaction

### Player Actions
1. **Toggle ON** Card Inspector from the Settings page (defaults to OFF).
2. **Judoka cards** will now show a collapsible JSON panel.
3. Each panel starts **collapsed** and can be expanded via a disclosure triangle (`<details>`).
4. Clicking outside a panel does not close it (explicit collapse required).
5. Disabling the toggle **immediately hides** all JSON panels without reloading.

### Cancel/Exit Options
- Users can collapse individual panels using the disclosure widget.
- Turning off the toggle removes all inspector content instantly.
- Inspector never appears unless both:
  - Toggle is ON.
  - `devMode=true` is active.

### Visual Feedback & Timing
- Panel expands/collapses with an ease-in animation.
- JSON is pretty-printed with 2-space indentation and syntax highlighting (if supported).
- Tapping/clicking the disclosure triangle (target size: 44×44px) toggles visibility.

---

## Acceptance Criteria

- The toggle switch appears in Settings, labeled “Card Inspector”, with the default state set to OFF.
- Toggle state persists between sessions and updates the UI without a full reload.
- JSON panel appears collapsed by default under each judoka card.
- JSON output is valid, formatted, and reflects the current state of card data.
- Disclosure control is keyboard-accessible and screen-reader-friendly.
- Inspector is completely hidden unless both `devMode=true` and the toggle are ON.
- The panel never overlaps gameplay UI elements or interferes with interactions.
- In cases of errors (e.g., invalid JSON, null card), a fallback message (“Invalid card data”) is shown.

---

## Design / Visual UX Guidelines

- Use a **light-gray box** with a 1px border and 4px padding.
- Content in **monospace font**, 12–14px.
- Panel height maxes out at 240px; scrollable if longer.
- Disclosure widget uses system-native `<details>` or custom with WCAG labels.
- Tap target size for disclosure toggle: **44×44px minimum**.
- Smooth animation on expand/collapse.
- Fully responsive layout for tablet and desktop; mobile support optional.

---

## Accessibility & Performance Constraints

- Must support keyboard tabbing and screen reader hints (e.g., “Card Data: collapsed”).
- Error handling for malformed card data (`try/catch` around render).
- No inspector content rendered on production builds unless QA override is active.

---

## Edge Cases / Fallbacks

- **Corrupt Data**: Show “Invalid card data” message.
- **Malformed JSON**: Show error block, prevent crash.
- **Toggle Fails**: Log error, fallback to default OFF state.
- **Rendering Issues**: If panel glitches, allow QA console reset or hard reload.
- **Non-DevMode**: Inspector must not render even if toggle is ON.

---

## Dependencies

- `cardBuilder.js` and `renderJudokaCard()` logic.
- Shared user preferences for toggle persistence.
- `devMode` flag accessible globally.

---

## Tasks

- [ ] 1.0 Implement Settings Toggle
  - [ ] 1.1 Add "Card Inspector" toggle switch to `settings.html`
  - [ ] 1.2 Set default state to OFF
  - [ ] 1.3 Persist toggle in user settings
  - [ ] 1.4 Reflect toggle state in UI immediately

- [ ] 2.0 Render JSON Panel in Cards
  - [ ] 2.1 Check for `toggle=true` and `devMode=true` in `cardBuilder.js`
  - [ ] 2.2 Inject formatted JSON into each card
  - [ ] 2.3 Use `<details>` for collapsibility with proper labeling

- [ ] 3.0 Visual and Responsive Styling
  - [ ] 3.1 Use light-gray box with border and monospace font
  - [ ] 3.2 Ensure 44px tap targets for disclosure toggle
  - [ ] 3.3 Limit max height and apply scroll behavior

- [ ] 4.0 Accessibility and Keyboard Support
  - [ ] 4.1 Add ARIA labels and keyboard controls
  - [ ] 4.2 Test with screen readers for all states
  - [ ] 4.3 Ensure tabbing through collapsed/expanded state works

- [ ] 5.0 Performance and Error Handling
  - [ ] 5.1 Profile inspector rendering time per card
  - [ ] 5.2 Wrap rendering logic in `try/catch`
  - [ ] 5.3 Display fallback message for errors

- [ ] 6.0 QA/Dev Mode Visibility
  - [ ] 6.1 Confirm dev-only visibility using `devMode` flag
  - [ ] 6.2 Add console warning if inspector loads without devMode
  - [ ] 6.3 QA shortcut for hard refresh toggle if needed