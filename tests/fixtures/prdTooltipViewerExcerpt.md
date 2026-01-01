---

## Tasks

- [x] 1.0 Load and Parse Tooltip Data
  - [x] 1.1 Load `tooltips.json` from `src/data/tooltips.json`
  - [x] 1.2 Handle loading failures with user-friendly error display
  - [x] 1.3 Parse JSON and extract key-value pairs
  - [x] 1.4 Display line and column numbers on JSON parse errors

- [x] 2.0 Implement Sidebar Key List
  - [x] 2.1 Render scrollable list of tooltip keys
  - [x] 2.2 Enable click interaction to select a tooltip
  - [x] 2.3 Add real-time search/filter functionality

  - [x] 2.4 Support full keyboard navigation (TAB, arrows, ENTER)
  - [x] 2.5 Group or color-code keys by prefix (category highlighting)
  - [x] 2.6 Sidebar scrolls independently from preview

- [x] 3.0 Build Preview Panel
  - [x] 3.1 Render raw tooltip text
  - [x] 3.2 Parse and render markdown-styled preview
  - [x] 3.3 Animate panel on update (fade-in)
  - [x] 3.4 Display visual indicators for blank/malformed tooltips (icon/tooltip)
    - [x] Blank entries flagged with warning icon
    - [x] Malformed entries flagged with warning icon
  - [x] 3.5 Include copy-to-clipboard buttons for key and body
  - [x] 3.6 Show warning for malformed markdown in preview
  - [x] 3.7 Truncate long values after 300px height; add native `<details>/<summary>` toggle
  - [x] 3.8 Copy-to-clipboard buttons provide feedback (e.g., tooltip/animation)
