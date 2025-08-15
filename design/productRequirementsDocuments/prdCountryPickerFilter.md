# PRD: Country Picker Filter

---

## TL;DR

This PRD defines a Country Picker Filter for Ju-Do-Kon! that lets players filter Judoka cards by country using an intuitive, accessible flag selector. The goal is to improve user engagement by enabling fast, pride-driven exploration of favorite countries’ athletes, with a performant, responsive, and accessible UI. The picker integrates directly with the Browse Judoka screen and card carousel, supporting both mouse/touch and keyboard navigation.

> Jamal logs into Ju-Do-Kon! after seeing a clip of his country’s top Judoka. He taps the country picker, slides open the panel, and spots his flag among dozens. One tap later, the screen fills with fierce fighters from his homeland. He feels proud — and motivated to start collecting more.

---

## Problem Statement

Players want to easily find and collect Judoka from their favorite countries, but currently there is no way to filter the roster by country. This leads to frustration, inefficient browsing, and missed opportunities for national pride and engagement. As the player base grows internationally, a Country Picker is essential for supporting regional pride, increasing session duration, and boosting card interaction rates. By surfacing country-based filtering, we make the game more inclusive, engaging, and easier to navigate for all users.

---

## Goals

- **Performance Goal**: Enable country filtering happens quickly for 90% of sessions.
- **Reliability Goal**: Achieve zero crashes related to the country selector over 100 sessions.
- **Coverage Goal**: Ensure >90% of available countries are selectable via the flag interface.
- **UX Goal**: Achieve a >95% success rate where users select the intended country without mis-taps.
- Let players easily find Judoka from their favorite countries.
- Provide a visually engaging, pride-driven exploration of the card roster.
- Ensure full accessibility compliance (see Accessibility section).

---

## Non-Goals

- Does not cover creation of new flag assets outside the existing judoka roster.
- Omits multi-country selection to keep interactions simple.

---

## User Stories

- As a player who supports my national team, I want to quickly filter Judoka by my country so I can see my favorite athletes.
- As a mobile player, I want country flags large enough to tap accurately so I don’t get frustrated with mistaps.
- As a player with limited vision, I want alt-text and good contrast on flags so I can recognize countries clearly.
- As a keyboard-only user, I want to navigate the country picker and select flags using the keyboard.

---

## How It Works

On in-scope screens (e.g., the Browse Judoka screen), there should be an option to toggle an overlay or slide-in panel that presents all available countries.

**Key Details:**

- Only countries present in the `judoka.json` file will be displayed.
- Instead of a list, the selector will use flag icons to represent each country.
- When a user clicks or presses Enter/Space on a flag:
  - The card carousel refreshes, filtering to display only judoka from the selected country (e.g., clicking Jamaica will filter to only Jamaican judoka).
- Users can only select one country at a time.
- A clear filter icon is provided to reset the selection and revert to displaying all judoka.
- Default display mode when opened is **slide-in panel**.
- The toggle is represented by a panel icon with an arrow.
- A separate layout toggle switches between the slide-in panel and full-screen grid.
- Countries are displayed in alphabetical order.
- Each flag button includes alt-text and an `aria-label` (e.g., "Filter by {country}") for accessibility.
- The picker supports keyboard navigation: Tab/Shift+Tab to move between flags, Enter/Space to select, and Escape to close the panel.
- The panel appears below the persistent top bar so the first row of countries is fully visible.
- If no judoka exist for a selected country, an empty state message is shown ("No judoka available for this country").
- If a flag asset fails to load, a generic fallback flag icon is displayed.
- For collections larger than 50 countries, virtual scrolling or paging is implemented to prevent UI overload.
- Progressive flag loading is used on slow networks to prioritize interactivity.

---

### Flow

1. Player opens the Browse Judoka screen and taps the country selector toggle.
2. The slide-in panel opens in under one second.
3. Players may use the layout toggle to expand to a full-screen grid or return to the slide-in panel.
4. Tapping or pressing Enter/Space on a flag filters the carousel and highlights the selected country.
5. The clear filter icon resets the view and the player continues browsing or closes the selector.
6. Keyboard users can navigate flags and close the panel with Escape.

---

## Prioritized Functional Requirements Table

| Priority | Feature                         | Description                                                                                                         |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Country selector toggle         | Allow users to toggle the country selector panel via a panel icon with an arrow and filter judoka cards by country. |
| **P1**   | Filtering and responsive time   | Ensure filtering is completed quickly for 90% of sessions.                                                          |
| **P2**   | Three display modes             | Provide hidden, slide-in (default), and full-screen grid views for the selector.                                    |
| **P2**   | Clear filter icon               | Provide an easy way to remove the current country filter.                                                           |
| **P2**   | Accessibility compliance        | Ensure alt-text, aria-labels, color contrast, keyboard navigation, and touch target size are all accessible.        |
| **P2**   | Alphabetical order              | Display country flags in alphabetical order.                                                                        |
| **P3**   | Performance optimizations       | Support large datasets (>50 countries) via virtual scrolling or paging.                                             |
| **P3**   | Fallback icon for missing flags | Display a fallback generic flag if assets fail.                                                                     |

---

## Acceptance Criteria

- The Country Picker toggle is visible on all screens where multiple Judoka cards are shown.
- Selecting a country in the Country Picker filters the visible Judoka list to only those from the selected country.
- The selected country is visually highlighted in the Country Picker.
- A clear filter icon resets the filter and shows all Judoka cards.
- Keyboard navigation is supported for all flag buttons and the clear filter icon.
- The Country Picker panel can be closed with Escape.
- Filtering completes within 1 second for 90% of sessions.
- All country flags have alt-text and aria-labels for accessibility.
- Flags are displayed in alphabetical order.
- If no Judoka exist for a selected country, an empty state message is shown.
- If a flag asset fails to load, a generic fallback flag icon is displayed.
- Tap target size for flags is at least 44x44px.
- Color contrast ratios meet WCAG 2.1 AA standards.
- Keyboard navigation and focus outlines are visible and accessible.

---

## Edge Cases and Failure States

- If no judoka exist for a selected country, show an empty state message (“No judoka available for this country”).
- If a flag asset fails to load, display a generic fallback flag icon.
- For collections larger than 50 countries, implement virtual scrolling or paging to prevent UI overload.
- On slow networks, implement graceful degradation with progressive flag loading to prioritize interactivity.
- If the country list is empty, display a message: "No countries available."

---

## Technical Considerations

- Pull available countries dynamically from `judoka.json` to avoid hardcoding.
- Use image sprite sheets or CDN hosting for flag assets to reduce HTTP requests.
- Use `IntersectionObserver` with `loading="lazy"` to defer flag image requests until they enter the viewport.
- Detect network conditions via `navigator.connection` to reduce initial batch sizes on slow connections.
- Fallback flag asset should be a small, lightweight SVG or PNG.
- Ensure caching headers on flags to minimize repeat loads.
- Integrate with the card carousel to trigger filtering and update the visible cards.
- Ensure the panel appears below the persistent top bar and is responsive to different screen sizes.
- Keyboard navigation and focus management must be implemented for all interactive elements.

---

## Dependencies and Integrations

- `judoka.json` data file for country information.
- Card carousel component which displays filtered judoka cards.
- Integrated with the Browse Judoka screen (see [PRD: Browse Judoka](prdBrowseJudoka.md)).

---

## Open Questions

- **Pending:** Decide whether to add text search for countries in addition to flag selection.
- **Pending:** Determine if analytics are needed for every country selection.

---

## Design and UX Considerations

- Background of the country selector uses `var(--color-secondary)` so flags and text meet the required 4.5:1 contrast ratio.
- Each country is represented by:
  - Flag icon.
  - Country name label beneath the flag.
- Three display modes:
  - Hidden: No UI visible until toggled.
  - Slide-in Panel (default): Narrow vertical panel with scroll.
  - Full-Screen Grid: Grid layout showing all countries.
- A layout toggle control switches between the slide-in panel and full-screen grid.
- Mobile Optimization:
  - Minimum tap target size of 44x44px for flags to ensure touch accessibility (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
  - Color contrast ratios must meet WCAG 2.1 AA standards for readability.
  - Selected country should be visually highlighted (e.g., border or shading).
  - Selector should respond well to different screen sizes (responsive design).
  - The panel must appear below the persistent top bar so the first row of countries is fully visible.
- Animation Considerations:
  - Slide-in animation respects the user's `prefers-reduced-motion` setting.
  - Flag grid fade-in duration uses `var(--transition-fast)`.
- Keyboard navigation:
  - Tab/Shift+Tab to move between flags and clear filter icon.
  - Enter/Space to select a flag or clear filter.
  - Escape to close the panel.
  - Focus outlines are visible and accessible.

---

### Wireframes

| **Country Picker Mockup 1**                                          |                                          **Country Picker Mockup 2** |
| -------------------------------------------------------------------- | -------------------------------------------------------------------: |
| ![Country Picker Mockup 1](/design/mockups/mockupCountryPicker1.png) | ![Country Picker Mockup 2](/design/mockups/mockupCountryPicker2.png) |

---

## Tasks

- [x] 1.0 Implement Country Flag Picker UI
  - [x] 1.1 Create hidden, slide-in panel (default), and full-screen grid layouts.
  - [x] 1.2 Load country flags with alt-text and labels, and ensure `aria-label` for each flag button.
  - [x] 1.3 Ensure responsive design for different screen sizes (mobile, tablet, desktop).
  - [x] 1.4 Implement selected flag highlighting (e.g., border, shading).
  - [x] 1.5 Implement clear filter icon.
  - [x] 1.6 Implement keyboard navigation and focus management for all interactive elements.
  - [x] 1.7 Implement fallback icon for missing flag assets.
  - [x] 1.8 Ensure the panel appears below the persistent top bar.
  - [x] 1.9 Ensure slide-in animation respects prefers-reduced-motion.
- [x] 2.0 Set Up Filtering Logic
  - [x] 2.1 Load `judoka.json` and extract a list of available countries.
  - [x] 2.2 Implement filtering of the card carousel based on the selected country.
  - [x] 2.3 Display an empty state message if no judoka exist for the selected country.
  - [x] 2.4 Export country code/list helpers for reuse.
  - [x] 2.5 Integrate country filter with card carousel update.
- [ ] 3.0 Optimize Performance
  - [x] 3.1 Implement virtual scrolling or paging for >50 countries.
  - [ ] 3.2 Ensure the filtering action completes quickly for 90% of sessions.
  - [ ] 3.3 Ensure the country selector appears quickly when toggled.
  - [ ] 3.4 Implement progressive flag loading using `IntersectionObserver`; network-aware batching remains outstanding.
- [ ] 4.0 Handle Edge Cases
  - [x] 4.1 Display a fallback icon if a flag asset fails to load.
  - [x] 4.2 Detect slow networks with `navigator.connection` to adjust flag loading.
  - [x] 4.3 Show a message if the country list is empty.
- [ ] 5.0 Ensure Accessibility and Compliance
  - [x] 5.1 Add alt-text for all flag icons based on country names and apply `aria-label` text like "Filter by {country}" to each flag button for screen readers.
  - [x] 5.2 Ensure color contrast ratios meet WCAG 2.1 AA standards.
  - [x] 5.3 Enforce minimum tap target size (44x44px) for touch devices (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
  - [x] 5.4 Ensure flags are displayed alphabetically.
- [x] 5.5 Ensure keyboard navigation and focus outlines are visible and accessible.

### Outstanding Work

- Implement progressive flag loading with `IntersectionObserver`, including network-aware batching and fallback strategies for slow connections.
- Validate performance benchmarks: filtering must complete within 1 second for 90% of sessions and the selector should appear quickly when toggled.

---

[Back to Game Modes Overview](prdGameModes.md)
