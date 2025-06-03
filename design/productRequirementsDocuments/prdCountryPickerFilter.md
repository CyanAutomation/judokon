# PRD: Country Flag Picker Filter

---

## Problem Statement

Each judoka and judoka card is affiliated with a country (e.g., a judoka might be part of the Spanish team). Currently, there is no way for players to browse judoka by country, which frustrates players when searching for their favorite country’s athletes.

The lack of an intuitive country filter diminishes user experience, leading to inefficient browsing and potential drop-off. By including a country picker, we aim to increase session duration and card interaction rates — both critical, as longer, more engaged sessions correlate directly with higher player retention and in-game activity.

This issue is timely as our player base is expanding internationally, and regional pride in athletes is becoming a key driver of engagement.

---

## Goals

- **Performance Goal**: Enable country filtering in under 1 second for 95% of users.
- **Reliability Goal**: Achieve zero crashes related to the country selector over 10,000 sessions.
- **Coverage Goal**: Ensure >90% of available countries are selectable via the flag interface.
- **UX Goal**: Achieve a >95% success rate where users select the intended country without mis-taps, measured via interaction telemetry post-launch.

---

## How It Works

On in-scope screens (e.g., the Browse Judoka screen), there should be an option to toggle an overlay or slide-in panel that presents all available countries.

Key Details:
- Only countries present in the `judoka.json` file will be displayed.
- Instead of a list, the selector will use flag icons to represent each country.
- When a user clicks on a flag:
  - The card carousel refreshes, filtering to display only judoka from the selected country (e.g., clicking Jamaica will filter to only Jamaican judoka).
  - The selected flag will be visually highlighted with a border.
- Users can only select one country at a time.
- A "Clear" button is provided to clear the selection and revert to displaying all judoka.
- Default display mode when opened is **slide-in panel**.

---

## Prioritized Functional Requirements Table

| Priority | Feature                     | Description                                                                          |
|---------|------------------------------|--------------------------------------------------------------------------------------|
| **P1**  | Country selector toggle       | Allow users to toggle the country selector panel and filter judoka cards by country. |
| **P1**  | Filtering and responsive time | Ensure filtering is completed within 1 second for 95% of users.                      |
| **P2**  | Three display modes           | Provide hidden, slide-in (default), and full-screen grid views for the selector.     |
| **P2**  | Clear button                  | Provide a clear, easy way to remove the current country filter.                     |
| **P3**  | Performance optimizations     | Support large datasets (>50 countries) via virtual scrolling or paging.             |
| **P3**  | Fallback icon for missing flags| Display a fallback generic flag if assets fail.                                     |
| **P3**  | Accessibility compliance      | Ensure alt-text, color contrast, and touch target size are all accessible.           |

---

## Acceptance Criteria

### Interaction
- On screens where multiple cards are shown, users are presented with the country selector toggle.
- Clicking a country flag:
  - Filters the card carousel to only show cards from that country.
  - The selected country flag is visually highlighted.
- A "Clear" button resets the card carousel to show all cards.

### Performance
- The filtering operation completes within 1 second.
- The selector appears in under 1 second when toggled open.
- The country selector must:
  - Support at least 100 countries without exceeding 200ms additional load time.

### Accessibility
- Provide alt-text for all country flags.
- Country flags must be displayed in alphabetical order.
- Provide clear feedback if no judoka exist for a selected country (empty state messaging).
- Handle missing flag assets gracefully with a fallback icon.
- Tap target size must be at least 48x48dp.
- Color contrast ratios must meet WCAG 2.1 AA standards.

---

## Edge Cases and Failure States

- If no judoka exist for a selected country, show an empty state message (“No judoka available for this country”).
- If a flag asset fails to load, display a generic fallback flag icon.
- For collections larger than 50 countries, implement virtual scrolling or paging to prevent UI overload.
- On slow networks, implement graceful degradation with progressive flag loading to prioritize interactivity.

---

## Design and UX Considerations

- Background of the country selector should use a dark color to help flags and text stand out.
- Each country is represented by:
  - Flag icon.
  - Country name label beneath the flag.
- Three display modes:
  - Hidden: No UI visible until toggled.
  - Slide-in Panel (default): Narrow vertical panel with scroll.
  - Full-Screen Grid: Grid layout showing all countries.
- Mobile Optimization:
  - Minimum tap target size of 48x48dp for flags to ensure touch accessibility.
  - Color contrast ratios must meet WCAG 2.1 AA standards for readability.
  - Selected country should be visually highlighted (e.g., border or shading).
  - Selector should respond well to different screen sizes (responsive design).
- Animation Considerations:
  - Slide-in animation duration: 300ms.
  - Flag grid fade-in duration: 200ms.

### Wireframes

![Country Picker Mockup](/design/mockups/mockupCountryPicker1.png)

---

## Tasks

- [ ] 1.0 Implement Country Flag Picker UI
  - [ ] 1.1 Create hidden, slide-in panel (default), and full-screen grid layouts.
  - [ ] 1.2 Load country flags with alt-text and labels.
  - [ ] 1.3 Ensure responsive design for different screen sizes (mobile, tablet, desktop).
  - [ ] 1.4 Implement selected flag highlighting (e.g., border, shading).
  - [ ] 1.5 Implement "Clear Selection" button.

- [ ] 2.0 Set Up Filtering Logic
  - [ ] 2.1 Load `judoka.json` and extract a list of available countries.
  - [ ] 2.2 Implement filtering of the card carousel based on the selected country.
  - [ ] 2.3 Display an empty state message if no judoka exist for the selected country.

- [ ] 3.0 Optimize Performance
  - [ ] 3.1 Implement virtual scrolling or paging for >50 countries.
  - [ ] 3.2 Ensure the filtering action completes within 1 second for 95% of users.
  - [ ] 3.3 Ensure the country selector appears within 1 second when toggled.

- [ ] 4.0 Handle Edge Cases
  - [ ] 4.1 Display a fallback icon if a flag asset fails to load.
  - [ ] 4.2 Implement progressive flag loading on slow networks.
  - [ ] 4.3 Verify performance and UX with large country lists (100+ countries).

- [ ] 5.0 Ensure Accessibility and Compliance
  - [ ] 5.1 Add alt-text for all flag icons based on country names.
  - [ ] 5.2 Ensure color contrast ratios meet WCAG 2.1 AA standards.
  - [ ] 5.3 Enforce minimum tap target size (48x48dp) for touch devices.
  - [ ] 5.4 Ensure flags are displayed alphabetically.

- [ ] 6.0 Add Visual Documentation
  - [ ] 6.1 Create annotated wireframes for the slide-in panel and full-grid views.
  - [ ] 6.2 Annotate wireframes with key UX and accessibility notes (tap sizes, highlight states, animation durations).
