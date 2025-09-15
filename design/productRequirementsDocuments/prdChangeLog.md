# PRD: Recent Judoka Updates Log

## TL;DR

This PRD describes the Recent Judoka Updates Log feature—a UI component that lets players and developers view the 20 most recently updated Judoka cards. It is not an actual changelog of the product, but a feature designed to increase transparency around balance changes and support QA/player engagement. The log is accessible from the Settings menu and displays a responsive, simplified table sourced from `judoka.json`.

---

## Problem Statement / Why It Matters

Players and developers currently lack a simple, in-game method to see which Judoka cards have been updated. This makes it difficult to track balance changes, test recent modifications, or understand why a favorite character may perform differently. Relying on code diffs or external communication is inefficient and excludes non-technical users.

---

## Goals

- Provide a fast, accessible way to view the 20 most recently updated Judoka cards in-game
- Improve transparency for balance changes and Judoka edits
- Support QA and player engagement by surfacing recent modifications directly in the UI
- Maintain global UI consistency: header, footer, fonts, and background style

---

## User Stories

- As a player, I want to see which Judoka cards were recently updated so I can understand balance changes.
- As a developer, I want to quickly verify that recent Judoka edits are reflected in the game UI.
- As a QA tester, I want to confirm that the most recently modified cards are displayed correctly and sorted as expected.

---

## Prioritized Functional Requirements

| Priority | Feature                  | Description                                                             |
| :------: | ------------------------ | ----------------------------------------------------------------------- |
|  **P1**  | Load and Parse Data      | Extract Judoka entries from `judoka.json`, including required fields.   |
|  **P1**  | Sort and Display Entries | Sort by `lastUpdated`, fallback to name; limit to 20 results.           |
|  **P2**  | Navigation Integration   | Add “Judoka Updates” access in the main menu with proper back behavior. |
|  **P2**  | Portrait Display         | Show portrait or fallback image with alt text and size constraints.     |
|  **P2**  | UI Consistency           | Maintain global game layout: header, footer, fonts, and spacing.        |
|  **P3**  | Error/Fallback Handling  | Show user-friendly messages for missing/invalid data or images.         |
|  **P4**  | Accessibility Support    | Support screen-readers and keyboard-only navigation.                    |

---

## Acceptance Criteria

- The log displays exactly 20 entries from `judoka.json`, sorted by `lastUpdated` (descending), then `name` (ascending) if dates match
- Each row includes: Judoka ID, Portrait (with alt text), Judoka Name, Card Code, Last Modified Date
- Portraits use a fallback image if missing, with appropriate alt text
- The log is accessible from the Settings menu and supports proper back navigation
- Global header and footer are present and match the main game theme
- The page is keyboard navigable and screen-reader compatible
- If `judoka.json` is missing or empty, display: "No Judoka data found."
- If loading takes longer than 3 seconds, show a loading spinner; if still no data, show fallback message
- Responsive layout: stacks columns below 600px width; all touchable areas ≥44px

---

## Non-Functional Requirements / Design Considerations

- Table rows appear instantly (no animation) to prioritize performance.
- Portrait thumbnails are 48×48 px with rounded corners.
- ID column width matches the 48 px portrait column because IDs never exceed three digits.
- All cells have a minimum 44px touch target.
- Responsive layout: two-column stacking below 600px width; portraits align left, text stacks right.
- Row height: min 56px; all touchable areas ≥44px.
- Tooltip and alt text for accessibility.
- Maintain consistent header/footer and background style with the main game.

---

## Dependencies and Open Questions

### Dependencies

- Access to `judoka.json` with up-to-date `lastUpdated` fields.
- Default placeholder portrait asset.
- Game header/footer components.

### Open Questions

- Should the log include a link to full card details?
- Should the log show more than 20 entries if requested?
- Should we allow filtering or searching within the log?

---

## Visual Reference (Wireframe Description)

```text
+------------------------------------------------+
| [Game Logo]                 [Judoka Updates]    |
+------------------------------------------------+
| Judoka ID | Portrait | Judoka Name | Card Code | Last Mod. |
| ----------|----------|-------------|-----------|-----------|
| 010       | 🖼️       | Kano        | JK-003    | Jul 20    |
| ...       | ...      | ...         | ...       | ...       |
+------------------------------------------------+
| Footer: Links, copyright, etc.                 |
+------------------------------------------------+
```

- Portrait column: **48x48px**, aligned left with margin.
- Row height: **min 56px**; all touchable areas ≥44px.
- Mobile layout stacks: Portrait on top, fields below.

---

## Implementation Notes

- Create `src/helpers/changeLogPage.js` to load `judoka.json` via `fetchJson` and
  populate the table on DOM ready.
- Sort entries by the `lastUpdated` field (desc) and fallback to name when dates
  match. Slice the results to the most recent 20.
- Build rows using DOM methods to avoid innerHTML injection. Each row includes
  Judoka ID, portrait (48×48 px), full name, card code, and formatted date.
- Portrait images use a fallback source (`judokaPortrait-0.png`) when loading
  fails, with alt text like "Portrait of Judoka Kano".
- The page follows existing layout conventions: header, `.home-screen` wrapper
  (set `height: 100dvh` so child grids size correctly), and bottom navigation bar.
  Include a spinner during loading and a friendly
  message if no data is available.
- Table rows alternate between `--color-surface` and `--color-tertiary` to
  create zebra striping, starting with `odd` for the first row.

---

## Tasks

### 1.0 Design Table Layout for Judoka Updates

- [x] **1.1** Define visual table layout and styling
- [x] **1.2** Include columns: Judoka ID, Portrait, Judoka Name, Card Code, Last Modified
- [x] **1.3** Add header and footer consistent with game theme
- [x] **1.4** Design for responsive layout (mobile/tablet)
- [x] **1.5** Apply zebra striping to table rows using CSS
- [x] **1.6** Ensure all cells have minimum 44px touch target and row height ≥56px

### 2.0 Implement Data Loading Logic

- [x] **2.1** Parse `judoka.json` and extract required fields
- [x] **2.2** Sort by last updated date, then by name
- [x] **2.3** Limit to 20 entries
- [x] **2.4** Use DOM methods to build table rows (avoid innerHTML injection)

### 3.0 Build Frontend Page

- [x] **3.1** Render table with dynamic content
- [x] **3.2** Add alt text for portraits (e.g., "Portrait of Judoka Kano")
- [x] **3.3** Show fallback portrait if image fails to load
- [x] **3.4** Add loading spinner while fetching data
- [x] **3.5** Remove spinner after data loads or on error
- [x] **3.6** Display "No Judoka data found" if data is missing or empty

### 4.0 Accessibility and Usability

- [x] **4.1** Ensure table is keyboard navigable
- [x] **4.2** Add ARIA labels and roles for accessibility
- [x] **4.3** Ensure alt text and tooltips for images
- [x] **4.4** Support screen readers

### 5.0 Error Handling

- [x] **5.1** Handle missing/empty `judoka.json`
- [x] **5.2** Gracefully degrade if images or data are unavailable
- [x] **5.3** Display “No Judoka data found” as appropriate
- [x] **5.4** Show loading spinner if loading takes longer than 3 seconds

### 6.0 QA and Testing

- [x] **6.1** Validate sorting logic using test data
- [ ] **6.3** Test responsive behavior on various screen sizes
- [ ] **6.4** Confirm consistent UI integration with game header/footer

---

## Implementation Status

### Completed

- Data loading, sorting, and 20-entry limit implemented in `changeLogPage.js`.
- Portraits use placeholder fallback and include alt text for accessibility.
- Page is linked from the Settings menu and retains global header and footer.
- Unit and Playwright tests cover sorting logic, portrait fallback, and basic rendering.

### Pending

- Responsive two-column layout for narrow screens has not been built.
- Loading spinner shows immediately; add delay logic or update requirement.
- QA: verify responsive behavior (Task **6.3**) and confirm header/footer integration across routes (Task **6.4**).
