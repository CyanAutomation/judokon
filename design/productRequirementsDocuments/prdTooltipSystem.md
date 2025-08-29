# PRD: Tooltip System (JU-DO-KON!)

## TL;DR

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
| **P2**   | Touch interaction support   | Tap shows tooltip; second tap outside hides; optional long-press delay on mobile. |
| **P2**   | JSON load error fallback    | Prevents UI issues if file loading fails.                                 |
| **P3**   | Keyboard focus parity       | Focus triggers and dismisses tooltips like hover.                         |
| **P3**   | Settings (delay, animation) | Optional dev configurability for UX tuning.                               |

---

## Acceptance Criteria

- All tooltips appear on hover or focus with no perceptible delay (≤150ms).
- Tooltips display on tap; a second tap outside hides them.
- Tooltip content is loaded from `tooltips.json` and matches the key provided in `data-tooltip-id`.
- Tooltip supports markdown-like formatting: bold, italics, and line breaks.
- Tooltip disappears when mouse leaves the element, focus is lost, or a second tap occurs outside the tooltip.
- Tooltip is styled according to JU-DO-KON! theme and remains readable on all screen sizes.
- Tooltip does not trigger browser-native tooltips (no use of `title` attribute).
- Tooltip is accessible via keyboard and screen reader (ARIA labels, semantic roles), mirroring hover behavior.
- Automated tests verify hover, tap, and keyboard navigation triggers.
- If `tooltips.json` fails to load, tooltips are suppressed and an error is logged once.

---

## Non-Functional Requirements

- Tooltip rendering must not block game performance; loading/parsing is asynchronous.
- Tooltip text remains readable and does not overlap other content on all supported screen sizes.
- Markdown parsing is lightweight and does not require a full markdown library unless needed.
- Tooltips are compatible with statically hosted environments (e.g. GitHub Pages).
- Tooltips support screen readers and meet accessibility standards (ARIA labels, semantic roles).

### Tooltip Content Guidelines

To ensure tooltips are consistently helpful and aligned with JU-DO-KON!’s tone, the following content standards must be followed when writing or reviewing tooltips:

- **Coverage**: Every interactive UI element that could confuse a new or young player should have a tooltip. Omit tooltips for elements where the function is fully self-explanatory.
  - Stats on cards must provide tooltip descriptions using accessible markdown.
  - Country flag icons require tooltips explaining nationality abbreviations.
  - Weight indicators must include tooltip text clarifying weight classes.
  - Navigation links in the battle screen should expose tooltip guidance.
  - Help icons anywhere in the UI must render tooltip content from `tooltips.json`.
- **Clarity**: Text should be immediately understandable, avoiding jargon. Game-specific terms must be explained using plain language. Aim for a reading level accessible to 10–12-year-olds.
- **Concisiveness**: Tooltips should be succinct – ideally one sentence, or two short ones. Avoid paragraphs or rambling explanations.
- **Tone & Voice**: Tooltips must reflect JU-DO-KON!’s style: casual, instructional, and game-themed. Prefer friendly second-person phrasing ("Tap to...") or descriptive third-person as appropriate.
- **Formatting & Consistency**: Use consistent style:
  - Bold (`**bold**`) key terms or stat names.
  - Italicize (`_italic_`) non-English terms or soft emphasis.
  - Use in-game terminology (e.g. "judoka", not "character").
  - Maintain uniform punctuation and capitalization.
- **Usefulness**: Each tooltip should add context or new information. Do not merely restate the label.
- **Accuracy**: Text must reflect the latest game rules and UI behavior. Outdated or misleading tooltips must be removed or revised.
- **Accessibility**: Tooltips should make sense when read aloud by a screen reader. Avoid directional phrases (“above”, “to the left”) unless paired with structural cues.
- **Uniqueness**: Tooltip content must not duplicate others. Ensure each tooltip serves a distinct explanatory purpose.
- **Review Process**: All new tooltips must pass a readability and tone check, including spelling, grammar, and natural phrasing when read aloud.

---

## Dependencies and Open Questions

### Dependencies:

- Access to `tooltips.json` file within `/data/` or similar directory.
- Basic utility functions for positioning and parsing markdown-like syntax.

### Open Questions:

- Should we support richer content in tooltips (e.g. icons, links)?
- Do we want to internationalize `tooltips.json` immediately or defer localization support?
- Should tooltip delays or animations be configurable in settings?

---

## See also:

- PRD: Browse Judoka (for card stat structure)
- PRD: Classic Battle (for stat selection flow where tooltips will appear)

---

## Tasks

- [x] 1.0 Setup Tooltip Content Source

  - [x] 1.1 Create `tooltips.json` in `/data/` with at least 10 entries
  - [x] 1.2 Define unique keys like `stat.power`, `stat.kumikata`, `stat.newaza`
  - [x] 1.3 Plan for optional localization structure (future-proof keys)
  - [x] 1.4 Review initial tooltips against the quality rubric before rollout.

- [x] 2.0 Implement Tooltip Trigger Logic

  - [x] 2.1 Detect elements with `data-tooltip-id`
  - [x] 2.2 Fetch corresponding tooltip text from `tooltips.json`
  - [x] 2.3 Handle missing or invalid keys gracefully (no error spam)
  - [x] 2.4 Support keyboard focus (Tab key) as a trigger

- [x] 3.0 Tooltip Rendering Engine

  - [x] 3.1 Parse markdown-like syntax into lightweight HTML
  - [x] 3.2 Render tooltip within 150ms of hover/focus
  - [x] 3.3 Adjust tooltip position to avoid viewport overflow
  - [x] 3.4 Add tooltip animation (fade in/out)

- [x] 4.0 Tooltip Styling and UX

  - [x] 4.1 Style tooltip: white bg, dark text, soft shadow, rounded corners
  - [x] 4.2 Ensure readability on all screen sizes
  - [x] 4.3 Define click/touch target behavior on mobile/tablets
  - [x] 4.4 Auto-hide on mouseout or focusout

- [x] 5.0 Error Handling and Accessibility

  - [x] 5.1 Suppress tooltips if `tooltips.json` fails to load
  - [x] 5.2 Log error only once
  - [x] 5.3 Avoid using `title=` attribute
  - [x] 5.4 Ensure tooltip is screen-reader compatible
- [ ] 5.5 Validate tooltip accessibility for screen readers and mobile/touch (manual and automated checks)
- [ ] 5.6 Add unit and Playwright UI tests to verify tooltip triggers, content, and dismissal
- [ ] 5.7 Ensure all required UI elements (stat cards, country flags, weight indicators, navigation links, help icons) have tooltips per guidelines
- [ ] 5.8 Create Playwright test cases for touch (tap/long-press) and keyboard tooltip triggers

- [ ] 6.0 (Optional) Settings and Configuration

  - [ ] 6.1 Add developer setting to configure tooltip delay
  - [ ] 6.2 Add toggle to enable/disable tooltip animation
  - [ ] 6.3 Document tooltip configuration options in README or UI guide
  - [ ] 6.4 Provide a user-facing toggle in the Settings menu to globally enable or disable tooltips
