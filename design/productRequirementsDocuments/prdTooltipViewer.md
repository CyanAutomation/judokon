# PRD: Tooltip Viewer

## TL;DR

The **Tooltip Viewer** is a standalone HTML page that enables team members — including content editors, developers, and QA testers — to browse and inspect all tooltip entries from `tooltips.json`. It features a left-hand list of tooltip keys (e.g., `stat.power`, `ui.selectStat`) and a right-hand preview panel displaying tooltip content with both rendered formatting and raw text. This viewer facilitates faster editing cycles, more consistent copy, and easier QA workflows across the JU-DO-KON! project.

---

## Problem Statement / Why It Matters

The JU-DO-KON! tooltip system relies on `tooltips.json`, but there’s currently no way to preview or validate tooltips outside live gameplay. This creates pain points in several workflows:

- **Content editors** struggle to review copy or ensure tone consistency without touching code or UI.
- **QA testers** must navigate multiple screens to find tooltip render errors or omissions.
- **Developers** need to verify correct key usage and markdown output, often through time-consuming builds.

During v0.7, a typo in `stat.focus` persisted through 3 releases due to lack of preview tools. As the tooltip set grows (>500 entries), copy drift and formatting bugs become more likely and harder to detect.

---

## Goals / Success Metrics

| Goal Description                                                                | Metric                            | Target             |
| ------------------------------------------------------------------------------- | --------------------------------- | ------------------ |
| Allow team members to browse all tooltip entries without touching the game code | Tooltip Viewer accessibility rate | 100%               |
| Reduce tooltip-related QA errors pre-deployment                                 | Tooltip-related bug count         | ↓ 50% per release  |
| Provide previews styled as in-game                                              | Rendering fidelity rating from QA | 100% match         |
| Improve editorial turnaround for tooltip updates                                | Copy revision cycle time          | ↓ from 3 days to 1 |

---

## User Stories

- As a **content editor**, I want to preview all tooltips so I can check clarity, formatting, and tone.
- As a **developer**, I want to verify that tooltip keys render the correct markdown output before wiring them into the UI.
- As a **QA tester**, I want to detect missing, duplicate, or invalid tooltip entries without needing to load every in-game context.

---

## Non-goals

- The viewer is **read-only** — no direct editing or saving.
- The page will only show **static previews**, not live gameplay or dynamic contexts.

---

## UX & UI Behavior

### Layout & Responsiveness

- Desktop: Sidebar (left, 35%) + Preview Pane (right, 65%)
- Mobile: Sidebar stacks above preview (≤600px)
- Smooth transitions when resizing

### Animations & Interactivity

- Clicked key animates with highlight (fade-in + border pulse, 150ms)
- Preview panel fades in (100ms delay) on selection
- Search box debounced (300ms) to avoid lag during input

### Accessibility

- All fonts ≥16px
- Color contrast meets WCAG AA (≥4.5:1)
- In dark mode the selected key should use the bright `--link-color` value to
  maintain WCAG AA contrast
- Full keyboard navigation support (TAB, arrows, ENTER)

---

## Prioritized Functional Requirements

| Priority | Feature                  | Description                                           |
| -------- | ------------------------ | ----------------------------------------------------- |
| **P1**   | JSON loader              | Load `tooltips.json` from `src/data/tooltips.json`.   |
| **P1**   | Sidebar key list         | Display all keys in a scrollable, clickable list.     |
| **P1**   | Preview pane             | Render tooltip content (markdown + raw string).       |
| **P1**   | Markdown parser          | Apply JU-DO-KON! tooltip formatting rules.            |
| **P2**   | Search/filter input      | Filter list by tooltip key or body content.           |
| **P2**   | Category highlighting    | Group or color-code by prefix (`stat`, `ui`, `mode`). |
| **P2**   | Invalid key validator    | Flag missing, empty, or malformed entries visually.   |
| **P3**   | Mobile responsive layout | Stack sidebar above preview on screens <600px.        |
| **P3**   | Copy-to-clipboard button | One-click copying of key or body content.             |
| **P3**   | Jump to key via URL hash | Auto-select a tooltip via `#keyname` on page load.    |

---

## Acceptance Criteria

- JSON loads successfully from `src/data/tooltips.json`.
- Sidebar renders a full list of keys; keys are clickable and selectable.
- Clicking a key updates preview with:
  - Markdown-rendered body (`**bold**`, `_italic_`, line breaks)
  - Raw string body for debug
- Visual indicators for empty, malformed, or invalid entries.
- Search filters keys live (debounced at 300ms).
- Viewer accepts URL hash (`#key`) and selects/scrolls accordingly.
- Copy buttons work for both key and body text.
- Layout adapts responsively to screen size.
- Elements expose `data-key`, `data-body`, and `data-valid` for QA.
- Viewer operates offline as a static HTML file.
- Styling matches JU-DO-KON! brand (typography, colors, spacing).

---

## Edge Cases & Failures

| Case                    | Handling Behavior                                                           |
| ----------------------- | --------------------------------------------------------------------------- |
| File missing            | Show "File not found" message in viewer panel                               |
| Corrupted JSON          | Render structured parse error (line, column) in preview area                |
| Malformed markdown      | Render best-effort version and flag preview with warning icon               |
| Missing/empty strings   | Highlight key with red icon and tooltip: "Empty or whitespace-only content" |
| Unrecognized key format | Warn if keys deviate from pattern `prefix.name`                             |
| Long values             | Truncate preview after 300px height; add “Show more” toggle                 |

---

## Tasks

- [ ] 1.0 Load and Parse Tooltip Data

  - [ ] 1.1 Load `tooltips.json` from `src/data/tooltips.json`
  - [ ] 1.2 Handle loading failures with user-friendly error display
  - [ ] 1.3 Parse JSON and extract key-value pairs

- [ ] 2.0 Implement Sidebar Key List

  - [ ] 2.1 Render scrollable list of tooltip keys
  - [ ] 2.2 Enable click interaction to select a tooltip
  - [ ] 2.3 Add real-time search/filter functionality (300ms debounce)

- [ ] 3.0 Build Preview Panel

  - [ ] 3.1 Render raw tooltip text
  - [ ] 3.2 Parse and render markdown-styled preview
  - [ ] 3.3 Animate panel on update (fade-in, 100ms)
  - [ ] 3.4 Display visual indicators for blank/malformed tooltips
  - [ ] 3.5 Include copy-to-clipboard buttons for key and body

- [ ] 4.0 URL Fragment Support

  - [ ] 4.1 Read and parse URL hash on page load
  - [ ] 4.2 Scroll to and pre-select corresponding tooltip key

- [ ] 5.0 UI/UX and Accessibility Enhancements
  - [ ] 5.1 Apply JU-DO-KON! styling (colors, spacing, typography)
  - [ ] 5.2 Ensure mobile responsiveness (stacked layout <600px)
  - [ ] 5.3 Include accessible font sizes and high contrast text
  - [ ] 5.4 Enable keyboard navigation and focus states
  - [ ] 5.5 Expose `data-*` attributes for automated QA
