# PRD: Tooltip System (JU-DO-KON!)

## Overview (TL;DR)

The Tooltip System introduces dynamic, in-context guidance across JU-DO-KON! using a flexible JSON-driven approach. By attaching a `data-tooltip-id` attribute to UI elements and rendering markdown-formatted text from a central `tooltips.json` file, the system allows players to receive concise, context-aware explanations during gameplay. This improves accessibility, player comprehension, and overall user experience, especially for younger or first-time users.

---

## Problem Statement / Why It Matters

New or less experienced players may not understand what certain game elements represent — such as unfamiliar stats (e.g. Kumi-kata (grip fighting)), game modes, or buttons — leading to confusion or disengagement. User feedback and playtest sessions have highlighted the need for clear in-context guidance:

> “I didn’t know what Kumi-kata (grip fighting) meant. I just picked the highest number.” — playtester, age 11

Currently, JU-DO-KON! has no way of surfacing explanatory text in the UI without hardcoding strings or duplicating content. This limits future extensibility, localization, and scalability of user help content.

**Why now**: As JU-DO-KON! expands its stat complexity and introduces new game modes, the barrier to entry for new players increases. Immediate in-context help is essential to prevent player drop-off and encourage exploration.

---

## Goals / Success Metrics

- Increase correct stat usage decisions by new players by 20% during their first 3 battles.
- Maintain consistent, scalable tooltips across the app from a single source of truth.
- Enable developers to implement tooltips in any part of the UI with a simple HTML attribute.
- Load and display tooltips in under 150ms on first hover.
- Render basic formatting (bold, italics, line breaks) without manual HTML.

---

## User Stories

- As a new player, I want to understand what a stat like Power or Kumi-kata (grip fighting) means so that I can make better decisions during a battle.
- As a designer, I want to update tooltip text for a stat or UI element in one place so that the change appears everywhere it’s used.
- As a developer, I want a reusable and lightweight tooltip system so that I don’t need to manually write popup logic for each feature.
- As a non-technical content editor, I want to be able to suggest or preview tooltip text without editing core JavaScript code.

---

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                               |
| -------- | --------------------------- | ------------------------------------------------------------------------- |
| **P1**   | tooltips.json store         | Central source for all tooltip content, enabling scalability and updates. |
| **P1**   | data-tooltip-id hook        | Lightweight implementation hook for developers to add tooltips easily.    |
| **P1**   | Positioning logic           | Ensures tooltips appear correctly and accessibly near elements.           |
| **P1**   | Markdown-like formatting    | Allows rich text without HTML bloat.                                      |
| **P2**   | Tooltip styling             | Visual consistency with the JU-DO-KON! theme.                             |
| **P2**   | Auto-hide on mouseout       | Ensures intuitive interaction flow.                                       |
| **P2**   | JSON load error fallback    | Prevents UI issues if file loading fails.                                 |
| **P3**   | Keyboard focus support      | Improves accessibility for non-mouse users.                               |
| **P3**   | Settings (delay, animation) | Optional dev configurability for UX tuning.                               |

---

## Acceptance Criteria

- [ ] The system loads `tooltips.json` once at app start and contains at least 10 tooltip entries in key-value format. (**P1: tooltips.json store**)
- [ ] Hovering an element with `data-tooltip-id="stat.kumikata"` displays a tooltip with the parsed value from `tooltips.json`. (**P1: data-tooltip-id hook**)
- [ ] Tooltip supports: `**bold**` as `<strong>`, `_italic_` as `<em>`, and `\n` as line breaks. (**P1: Markdown-like formatting**)
- [ ] Tooltip appears within **150ms** of hover and is positioned relative to the element (bottom-left preferred). (**P1: Positioning logic**)
- [ ] Tooltip disappears when the mouse leaves the element or when focus is lost. (**P2: Auto-hide on mouseout**)
- [ ] If an invalid `data-tooltip-id` is provided (no matching key), no tooltip appears and no console error is thrown. (**P1: data-tooltip-id hook**)
- [ ] Styling matches visual guidelines: white background, dark text, soft shadow, rounded corners. (**P2: Tooltip styling**)
- [ ] If `tooltips.json` fails to load at runtime, tooltips are suppressed and an error is logged once. (**P2: JSON load error fallback**)
- [ ] Focusing on an element using the **Tab** key shows the tooltip with the same content. (**P3: Keyboard focus support**)
- [ ] On mobile/tablet, tooltips appear on long-press or tap-hold and dismiss on tap away. (**P3: Keyboard focus support**)

---

## Non-Functional Requirements / Design Considerations

- Tooltip rendering **must not block game performance**; loading/parsing must be asynchronous.
- Tooltip text should remain **readable on all supported screen sizes** and not overlap other content.
- Markdown parsing must be **lightweight** and not require bundling a full markdown library unless needed.
- Tooltips must **not trigger browser-native tooltips** (avoid `title=` attribute).
- Tooltip logic must be **compatible with statically hosted environments** (e.g. GitHub Pages).
- Tooltips should support **screen readers** and meet basic accessibility standards (ARIA labels, semantic roles).
- _Optional_: Developers can configure tooltip appearance delay and animation speed using a settings object.

---

## Dependencies and Open Questions

### Dependencies:

- Access to `tooltips.json` file within `/data/` or similar directory.
- Basic utility functions for positioning and parsing markdown-like syntax.

### Open Questions:

- Should we support richer content in tooltips (e.g. icons, links)?
- Do we want to internationalize `tooltips.json` immediately or defer localization support?
- Should tooltip delays or animations be configurable in settings?
- Should touch-triggered tooltips behave the same on tablets as on phones?

---

## See also:

- PRD: Browse Judoka (for card stat structure)
- PRD: Classic Battle (for stat selection flow where tooltips will appear)

---

## Tasks

- [ ] 1.0 Setup Tooltip Content Source

  - [ ] 1.1 Create `tooltips.json` in `/data/` with at least 10 entries
  - [ ] 1.2 Define unique keys like `stat.power`, `stat.kumikata`, `stat.newaza`
  - [ ] 1.3 Plan for optional localization structure (future-proof keys)

- [ ] 2.0 Implement Tooltip Trigger Logic

  - [ ] 2.1 Detect elements with `data-tooltip-id`
  - [ ] 2.2 Fetch corresponding tooltip text from `tooltips.json`
  - [ ] 2.3 Handle missing or invalid keys gracefully (no error spam)
  - [ ] 2.4 Support keyboard focus (Tab key) as a trigger

- [ ] 3.0 Tooltip Rendering Engine

  - [ ] 3.1 Parse markdown-like syntax into lightweight HTML
  - [ ] 3.2 Render tooltip within 150ms of hover/focus
  - [ ] 3.3 Adjust tooltip position to avoid viewport overflow
  - [ ] 3.4 Add tooltip animation (fade in/out)

- [ ] 4.0 Tooltip Styling and UX

  - [ ] 4.1 Style tooltip: white bg, dark text, soft shadow, rounded corners
  - [ ] 4.2 Ensure readability on all screen sizes
  - [ ] 4.3 Define click/touch target behavior on mobile/tablets
  - [ ] 4.4 Auto-hide on mouseout or focusout

- [ ] 5.0 Error Handling and Accessibility

  - [ ] 5.1 Suppress tooltips if `tooltips.json` fails to load
  - [ ] 5.2 Log error only once
  - [ ] 5.3 Avoid using `title=` attribute
  - [ ] 5.4 Ensure tooltip is screen-reader compatible

- [ ] 6.0 (Optional) Settings and Configuration
  - [ ] 6.1 Add developer setting to configure tooltip delay
  - [ ] 6.2 Add toggle to enable/disable tooltip animation
  - [ ] 6.3 Document configuration options in README or UI guide
