# PRD: Tooltip Viewer Page (`tooltipViewer.html`)

## TL;DR

The **Tooltip Viewer** is a standalone HTML page that allows team members — including content editors, developers, and QA testers — to browse and inspect all tooltip entries from `tooltips.json`. It features a left-hand list of tooltip keys (e.g., `stat.power`, `ui.selectStat`) and a right-hand preview panel displaying tooltip content with both rendered formatting and raw text. This tool enables faster editing cycles, more consistent copy, and easier QA workflows across the JU-DO-KON! project.

---

## Problem Statement / Why It Matters

The JU-DO-KON! tooltip system relies on `tooltips.json`, but there’s currently no way to preview or validate tooltips outside live gameplay. This causes friction and errors in the following workflows:

- **Content editors** struggle to review copy or ensure tone consistency without touching code or UI.
- **QA testers** must navigate multiple screens to find tooltip render errors or omissions.
- **Developers** need to verify correct key usage and markdown output, often through time-consuming builds.

For example, during v0.7, a typo in `stat.focus` persisted through 3 releases due to lack of preview. As the tooltip set expands (>500 entries), inconsistencies and outdated content become harder to catch.

---

## Goals / Success Metrics

| Goal Description                                                                 | Metric                                 | Target         |
| -------------------------------------------------------------------------------- | -------------------------------------- | -------------- |
| Allow team members to browse all tooltip entries without touching the game code | Tooltip Viewer accessibility rate      | 100%           |
| Reduce tooltip-related QA errors pre-deployment                                 | Tooltip-related bug count              | ↓ 50% per release |
| Provide previews styled as in-game                                              | Rendering fidelity rating from QA      | 100% match     |
| Improve editorial turnaround for tooltip updates                                | Copy revision cycle time               | ↓ from 3d to 1d |

---

## User Stories

- As a **content editor**, I want to preview all tooltips so that I can check clarity, formatting, and tone.
- As a **developer**, I want to verify that tooltip keys render the correct markdown output before wiring them into the UI.
- As a **QA tester**, I want to detect missing, duplicate, or invalid tooltip entries without needing to load every in-game context.

---

## Non-goals

- This viewer will be **read-only** — no direct editing or saving.
- The page will only show **static previews**, not live game contexts or states.

---

## Prioritized Functional Requirements

| Priority | Feature                  | Description                                                                 |
| -------- | ------------------------ | --------------------------------------------------------------------------- |
| **P1**   | JSON loader              | Load `tooltips.json` from `src/data/tooltips.json`.                         |
| **P1**   | Sidebar key list         | Display all keys in a scrollable, clickable list.                           |
| **P1**   | Preview pane             | Render the tooltip content (markdown output and raw string).                |
| **P1**   | Markdown parser          | Apply JU-DO-KON! tooltip formatting rules.                                  |
| **P2**   | Search/filter input      | Filter list by tooltip key or body content.                                 |
| **P2**   | Category highlighting    | Optionally group or color-code by prefix (`stat`, `ui`, `mode`).            |
| **P2**   | Invalid key validator    | Flag missing, empty, or malformed entries visually.                         |
| **P3**   | Mobile responsive layout | Stack sidebar above preview on small screens (<600px).                      |
| **P3**   | Copy-to-clipboard button | Allow one-click copying of key or body content.                             |
| **P3**   | Jump to key via URL hash | Auto-select a tooltip via `#keyname` on page load.                          |

---

## Acceptance Criteria

- JSON loads successfully from `src/data/tooltips.json` on page load.
- Sidebar renders a full list of tooltip keys; keys are clickable and selectable.
- Clicking a key updates the preview pane with:
  - Markdown-rendered tooltip body (`**bold**`, `_italic_`, line breaks)
  - Raw string body (QA/debug use)
- Empty/null/malformed values are flagged in the UI (e.g., icon, red text).
- Viewer works offline as a static page (no server dependency).
- Search input filters visible keys in real time (live substring match).
- Viewer accepts `#key` in URL and scrolls/selects it on load.
- Copy buttons are present and functional for both body and key.
- Layout shifts from two-column to stacked layout on narrow viewports (<600px).
- All elements expose `data-*` attributes for automated testing (`data-key`, `data-body`).
- Styling matches JU-DO-KON! typography, spacing, and colors.
- Graceful fallback UI shown if the JSON cannot be parsed or is missing.

---

## Edge Cases / Failure States

- **File missing**: Display "File not found" error in viewer area.
- **Corrupted JSON**: Catch parse error and render structured error message.
- **Malformed markdown**: Render best-effort output, flag warning near preview.
- **Missing keys**: Tooltip entries with empty strings or only whitespace are highlighted.
- **Unrecognized keys**: Warn if keys deviate from naming conventions (`.*.*`).
- **Overly long values**: Clip preview body to prevent layout breaks, with "Show more" toggle.

---

## Design and UX Considerations

- **Consistency**: Use existing tooltip fonts, sizes, spacing rules.
- **Accessibility**: Ensure font size ≥16px, sufficient contrast (>4.5:1), and keyboard navigation.
- **Responsiveness**: Sidebar stacks above preview on mobile (<600px).
- **Interactivity**: Visual hover and selection states; real-time filtering feedback.
- **Testability**: Expose `data-key`, `data-body`, and `data-valid` attributes per item.
