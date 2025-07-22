# PRD: Recent Judoka Updates Log

## Description

Players and game developers need a clear, accessible way to view which Judoka cards have been recently updated. This transparency supports testing, game balance awareness, and reduces the need for developers to access system code. For players, this offers visibility into potential balance changes or adjustments to their favorite characters.

A **“Judoka Updates”** button will be added to the main menu. Tapping this takes the player to a standalone web page that displays a summary table of the **20 most recently modified Judoka cards**. This view is dynamically generated from `judoka.json` on each page load. The table uses a simplified format (not full card visuals) for fast loading and easy scanning.

## Goals

- Allow **players and developers** to view the 20 most recently updated Judoka cards.
- Support **quick performance**: Page should load fully in **under 2 seconds** on mid-tier tablets with 2GB RAM over a 3G mobile network.
- Improve visibility into Judoka rebalances without navigating developer tools or card-by-card comparisons.
- Maintain **global UI consistency**: Game header, footer, fonts, and background style.

## Player Flow

1. Player taps **“Judoka Updates”** from the main menu.
2. The page loads the update table showing:
   - Judoka ID
   - Card Code
   - Portrait (thumbnail)
   - Last Modified Date
   - Judoka Name
3. Player can scroll the list (no pagination).
4. Player taps browser/system back to exit the page.

**Cancel/Back:** System back or clicking the game logo in the header returns the player to the home screen.

## Table Behavior & UX Notes

- Table rows appear instantly (no animation) to prioritize performance.
- Portrait thumbnails are 48×48 px with rounded corners.
- All cells have a minimum 44px touch target.
- Responsive layout:
  - Two-column stacking below 600px width.
  - Portraits align left, text stacks right.

## Acceptance Criteria

- [ ] List displays exactly 20 entries from `judoka.json`.
- [ ] Entries are sorted by `lastModified` (descending), then `name` (ascending) if dates match.
- [ ] Each row includes: Judoka ID, Card Code, Portrait, Last Modified Date, Judoka Name.
- [ ] Page loads fully in <2s on mid-tier mobile device with 3G connection.
- [ ] Global header and footer are present and match the main game theme.
- [ ] If `judoka.json` is missing or empty, display: “No Judoka data found.”
- [ ] If a portrait image is missing, show the default placeholder portrait.
- [ ] Alt text is present for all portraits (e.g., “Portrait of Judoka <Name>”).
- [ ] The page is navigable by keyboard and screen-reader compatible.

## Edge Cases / Failure States

- **Missing/corrupt `judoka.json`** → Show message: _“No Judoka data found.”_
- **Empty dataset** → Same fallback message.
- **Identical modification timestamps** → Sort alphabetically by Judoka name.
- **Missing portrait asset** → Show default placeholder.
- **Slow network** → Show loading spinner for up to 3 seconds; if still no data, show fallback message.

## Visual Reference (Wireframe Description)

+------------------------------------------------+
| [Game Logo]                 [Judoka Updates]    |
+------------------------------------------------+
| Judoka ID | Card Code | Portrait | Last Mod. | Name |
| ----------|------------|----------|-----------|------|
| 010       | JK-003     | 🖼️       | Jul 20     | Kano |
| ...       | ...        | ...      | ...        | ...  |
+------------------------------------------------+
| Footer: Links, copyright, etc.                 |
+------------------------------------------------+

- Portrait column: 48x48px, aligned left with margin.
- Row height: min 56px; all touchable areas ≥44px.
- Mobile layout stacks: Portrait on top, fields below.

## Prioritized Functional Requirements

| Priority | Feature                 | Description                                                                 |
|----------|--------------------------|-----------------------------------------------------------------------------|
| **P1**   | Load and Parse Data      | Extract Judoka entries from `judoka.json`, including required fields.       |
| **P1**   | Sort and Display Entries | Sort by `lastModified`, fallback to name; limit to 20 results.              |
| **P2**   | Navigation Integration   | Add “Judoka Updates” access in the main menu with proper back behavior.     |
| **P2**   | Portrait Display         | Show portrait or fallback image with alt text and size constraints.         |
| **P2**   | UI Consistency           | Maintain global game layout: header, footer, fonts, and spacing.            |
| **P3**   | Error/Fallback Handling  | Show user-friendly messages for missing/invalid data or images.             |
| **P4**   | Accessibility Support    | Support screen-readers and keyboard-only navigation.                        |

## Tasks

- [ ] 1.0 Design Table Layout for Judoka Updates
  - [ ] 1.1 Define visual table layout and styling
  - [ ] 1.2 Include columns: Judoka ID, Card Code, Portrait, Last Modified, Name
  - [ ] 1.3 Add header and footer consistent with game theme
  - [ ] 1.4 Design for responsive layout (mobile/tablet)

- [ ] 2.0 Implement Data Loading Logic
  - [ ] 2.1 Parse `judoka.json` and extract required fields
  - [ ] 2.2 Sort by last modified date, then by name
  - [ ] 2.3 Limit to 20 entries

- [ ] 3.0 Build Frontend Page
  - [ ] 3.1 Render table with dynamic content
  - [ ] 3.2 Add alt text for portraits
  - [ ] 3.3 Ensure accessibility (keyboard/tab navigation)

- [ ] 4.0 Error Handling
  - [ ] 4.1 Handle missing/empty `judoka.json`
  - [ ] 4.2 Gracefully degrade if images or data are unavailable
  - [ ] 4.3 Display “No Judoka data found” as appropriate

- [ ] 5.0 QA and Testing
  - [ ] 5.1 Validate sorting logic using test data
  - [ ] 5.2 Test loading time on different devices
  - [ ] 5.3 Test responsive behavior on various screen sizes
  - [ ] 5.4 Confirm consistent UI integration with game header/footer
