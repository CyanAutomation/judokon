# QA Report for `src/pages/browseJudoka.md`

## Issues Summary

| Issue                                                            | Steps to reproduce                                                                                                                                                                                                                                                                        | Impact                                                                                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Country flag picker becomes unusable after horizontal scroll** | 1. Click the **Country filter** toggle (first red icon).  2. When the slide‑out panel appears, use a horizontal scroll gesture (mouse‑wheel left/right) on the flag row.  3. The flag row disappears, leaving an empty panel. There is no way to scroll back, so no flags are selectable. | Users can accidentally hide the country selector and cannot filter by country. The panel becomes blank, so players cannot pick or change countries. This is high priority because it prevents a primary filtering workflow. |
| **Selecting a flag does not filter the roster**                  | 1. Open the country panel.  2. Click any flag (e.g., the Portugal flag).  3. The panel briefly shows a larger version of the clicked flag, but the card carousel does not update; all judoka remain visible.                                                                              | Filtering appears non‑functional, preventing players from narrowing the roster by country. This fails acceptance criteria requiring country filter to limit cards. This may be caused by missing event wiring or a mismatch between flag IDs and country keys in the dataset. |
| **Card stats require vertical scrolling**                        | Each card container includes its own vertical scroll bar. On desktop at 1024 px width, users must scroll within a card to see the bottom of the stats section. The PRD states that judoka cards should “display all stats without scrolling on common desktop resolutions”.               | Usability & accessibility issue; players may not realize additional stats exist below the fold. This can be solved by layout adjustments or slightly reduced padding/line-height for desktop breakpoints.                                                                    |
| **Center card not clearly enlarged**                             | The PRD specifies that the focused (center) card should be enlarged by ~10%. In the current build, the enlargement on focus/hover is subtle and almost imperceptible.                                                                                                                     | The intended “binder‑like” feeling and focus cue are lost, reducing visual polish and accessibility. Note: ensure enlargement does not cause layout shift that hides adjacent cards at common viewport sizes.                                                               |
| **Page marker highlight difficult to interpret**                 | The page markers below the carousel are tiny dots with only a slight color change. They do not announce updates via an `aria-live` region as required.                                                                                                                                    | Screen‑reader users may not get feedback about their position in the carousel, and sighted players may have difficulty seeing which page is active. Recommendation: increase active marker size and add an `aria-live` text node that announces "Page X of Y" on change.                |
| **Country flags not obviously alphabetized**                     | The flag row shows countries in an order that does not match alphabetical sorting (e.g., Suriname, Georgia, Jamaica, Portugal appear together). The PRD mandates alphabetical ordering.                                                                                                   | Inconsistent ordering makes it harder for players to find their country and conflicts with the acceptance criteria. Note: sorting should use the displayed country name (localized if applicable) and stable sort on country code as a tiebreaker.                                               |
| **Tooltip and icons on small screens**                           | The panel toggle, clear filter and navigation buttons appear small (~24 px). The PRD calls for a minimum tap‑target size of 44×44 px.                                                                                                                                                     | Touch users may find it difficult to tap the small icons accurately. Recommendation: apply hit-area padding while preserving visual icon size to maintain layout.                                                                                               |
| **No visible error handling**                                    | Disconnecting from the network during testing did not show an “Unable to load roster” message or retry button, though the PRD specifies this for network failures.                                                                                                                        | Players experiencing connectivity issues might see a blank screen without guidance. Recommendation: show a dismissible, focusable error region with a Retry button and include telemetry for failure rates.                                                                                |
| **Keyboard closing of country panel not evident**                | The panel does not indicate that pressing `Escape` closes it; only clicking the toggle hides it. This diverges from the requirement that the panel support closing via Escape.                                                                                                            | Keyboard‑only users may struggle to dismiss the panel once opened. Recommendation: add keyboard handlers, focus trapping, and visible focus styles when panel is opened.                                                                                                 |

---

## Revised Fix Plan & Improvement Opportunities

This plan addresses the issues identified in the QA report with specific, actionable steps. It adds explicit acceptance criteria, assumptions, and a short test checklist for each item. The country picker horizontal-scroll problem is marked as high priority and the CSS remediation explicitly prevents horizontal scrolling.

### 1. Country Filter Panel (High priority)

- **Issue:** Horizontal scroll breaks the flag picker; filtering is non-functional; flags are not alphabetized.
- **Acceptance criteria:**
    - Country flag panel must never show a horizontal scrollbar at any viewport width.
    - Clicking a flag filters the roster to matching judoka.
    - Flags are alphabetized by displayed name (localized if applicable).
- **Fixes:**
    1.  Disable horizontal scrolling and allow wrapping (CSS):

        ```css
        /* Ensure no horizontal scroll and keep flag tappable area accessible */
        .flag-container {
          display: flex;
          flex-wrap: wrap; /* Wrap flags to multiple rows */
          overflow-x: hidden; /* Prevent horizontal scrolling entirely */
          gap: 8px; /* small visual gap between flags */
        }

        /* If the design requires a single-line scroller on large screens, prefer scroll-snap with a hidden scrollbar instead of allowing free horizontal wheel scroll */
        .flag-container.single-line {
          overflow-x: auto;
          -ms-overflow-style: none; /* hide scrollbar IE/Edge */
          scrollbar-width: none; /* hide scrollbar Firefox */
        }
        .flag-container.single-line::-webkit-scrollbar { display: none; }
        ```

        **Rationale:** the explicit `overflow-x: hidden` removes horizontal wheel/trackpad scroll from producing a one-line overflow that later becomes impossible to recover from. If a single-line scroller is still a design requirement, implement `single-line` mode with hidden scrollbar + visible scroll affordance and ensure wheel events do not collapse the content.

    2.  Implement filtering wiring: clicking a flag should emit a semantic event (e.g., `countrySelected(code)`) that updates the roster data source and resets the carousel index to 0. If there are no matches, show a friendly message "No judoka found for {Country}" and an inline "Show all" action.

    3.  Alphabetize flags on render using locale-aware compare:

        ```javascript
        countries.sort((a, b) => a.displayName.localeCompare(b.displayName || a.name, undefined, { sensitivity: 'base' }));
        ```

- **Verification / Test checklist:**
    - Confirm there is never a horizontal scrollbar on `.flag-container` in desktop and small viewports.
    - Click several flags and verify the carousel shows only matching cards and the carousel index resets.
    - Confirm message appears for zero results and "Show all" restores the full roster.

### 2. Judoka Card Carousel

- **Issue:** Cards have internal scrollbars; center card enlargement is not noticeable; page markers are unclear.
- **Acceptance criteria:**
    - Cards must display all stats without internal vertical scroll at common desktop widths (>= 1024px).
    - Center card must be visually and programmatically indicated (scale >= 1.08 and aria attributes).
    - Carousel page markers must be visible, have a clear active state, and changes announced to screen readers.
- **Fixes:**
    - Adjust card CSS (desktop breakpoint) to fit content: reduce vertical padding, tighten line-height for stat rows, and prefer two-column stat layouts where feasible.
    - Increase center-card scale to 1.08–1.12 with a 200ms transition. Add `aria-current="true"` to the active card and `role="group" aria-roledescription="carousel"` to the container.
    - Replace tiny dots with larger markers (10–12px) and add a visually hidden `div[aria-live="polite"]` that updates to "Page X of Y" when the carousel page changes.
- **Verification / Test checklist:**
    - Confirm no card shows an internal vertical scrollbar at 1024px desktop.
    - Verify center card is clearly larger and programmatically marked.
    - Confirm screen readers announce page changes via the aria-live region.

### 3. Accessibility & Usability

- **Issue:** Small tap targets; keyboard navigation missing for the country panel.
- **Acceptance criteria:**
    - All interactive targets meet 44×44px hit area (visually or via padding) on touch breakpoints.
    - Panel can be opened/closed via keyboard (Enter/Space on toggle, Escape to close) and focus is trapped while open.
- **Fixes:**
    - Add hit-area padding via CSS to buttons without changing visual icon size (e.g., `.icon-btn { padding: 10px; }`).
    - Implement focus trapping (use the app's existing modal/focus-trap helper if available). Add keyboard listeners to close on Escape and ensure toggle is operable with Enter/Space.
- **Verification / Test checklist:**
    - Measure hit targets in devtools (touch emulation) to ensure 44×44px.
    - Test keyboard-only flows: open panel, move focus to flag, activate flag, Escape to close, and ensure focus returns to toggle.

### 4. General Polish & Robustness

- **Issue:** No error handling for network failures.
- **Acceptance criteria:**
    - Network errors show a clear error state with a Retry action and do not leave the UI blank.
    - Key elements expose `data-testid` attributes for reliable Playwright targeting.
- **Fixes:**
    - Add a catch path for the roster fetch that renders an error card with Retry and telemetry hook.
    - Add `data-testid` attributes to filter controls, carousel, and cards.
- **Verification / Test checklist:**
    - In devtools, simulate offline and verify the error UI and Retry flow.
    - Confirm `data-testid` attributes exist for tests.

### Assumptions & Risks

- **Assumption:** The country data source includes a stable display name and an ISO country code for filtering keys. If not, mapping will be needed.
- **Assumption:** The carousel component can accept an updated list and reset its index programmatically. If it cannot, a small change to the carousel public API will be required.
- **Risk:** Increasing the center-card scale may cause layout shift; test across common viewport widths and adjust scale or card spacing accordingly.

### Developer handoff notes

- Provide a short PR checklist for reviewers:
    1.  Verify `.flag-container` has no horizontal scrollbar at 320–1440px.
    2.  Verify clicking flags filters roster and resets carousel index.
    3.  Verify keyboard accessibility (Escape closes, focus trapped).
    4.  Verify network error UI and Retry flow.
    5.  Confirm `data-testid` coverage for Playwright selectors.

---

Please review these changes and let me know if you'd like me to also (a) search for the component files and propose exact code changes, or (b) implement the fixes and a small test set in a feature branch.

---

## Playwright layout assessment

I ran a small Playwright layout assessment script that loads `src/pages/browseJudoka.html` at multiple viewport sizes and captures screenshots + simple layout diagnostics. The script was run against the project's static server (`http://127.0.0.1:5000`) to ensure scripts load without CORS restrictions.

### Summary of automated findings (from `test-results/layout-screenshots/layout-assessment.json`):

- Scripts loaded successfully (no CORS errors), but there were some 404 resource errors and schema validation warnings (likely unrelated to layout).
- The country flag track (`.country-flag-slide-track` / `#country-list`) exists but reports 0 clientWidth/scrollWidth, suggesting it's empty or hidden by default (panel is closed initially).
- **Horizontal overflow detected:** The card carousel (`.card-carousel`) has horizontal scroll (scrollWidth > clientWidth) at all viewports, which is expected for a carousel. However, individual judoka cards also have horizontal overflow (e.g., scrollWidth 251px vs clientWidth 210px on mobile), indicating cards are wider than their containers — this is a layout bug that needs fixing.
- **Vertical scroll in cards confirmed:** Multiple judoka cards and their sub-elements (`.card-name`, `.card-stats`) have vertical scroll, matching the QA report's issue about cards requiring vertical scrolling on desktop.
- No page-level horizontal scrollbar detected across viewports.

### What this means:

- The Playwright run now validates dynamic behaviors since scripts loaded. The horizontal overflow in individual cards is a critical issue — cards should fit their containers without horizontal scroll.

### Recommendations & how to reproduce locally:

1.  Start the project's simple static server (already included) and point the Playwright script at it:

    ```bash
    # in repo root
    # start server (runs on 127.0.0.1:5000 by default)
    node scripts/playwrightServer.js &

    # then run the assessment pointing at the server
    node scripts/pw-layout-assess.mjs http://127.0.0.1:5000
    ```

2.  Inspect generated artifacts in `test-results/layout-screenshots/`:

    - `mobile.png`, `tablet.png`, `desktop.png` — full-page screenshots
    - `layout-assessment.json` — structured layout checks and console messages

3.  Run the Playwright assessment against the deployed site (if available) to catch environment-specific layout regressions.

### Opportunities surfaced by the screenshots and diagnostics:

- **Fix card horizontal overflow:** Cards have scrollWidth > clientWidth (e.g., 251px vs 210px on mobile). Adjust card CSS to ensure content fits without horizontal scroll — likely reduce padding, font size, or use flexbox for better wrapping.
- **Address vertical scroll in cards:** Confirmed vertical scroll in `.card-stats` and `.card-name` elements. Implement the earlier suggestion: adjust desktop CSS (e.g., reduce line-height, use two-column stat layout) to fit all stats without scroll.
- **Verify carousel horizontal scroll:** The carousel itself has horizontal scroll (expected), but ensure it's controlled (e.g., via buttons, not free wheel scroll) to avoid accidental collapse like the country panel.
- **Check country panel after opening:** Re-run checks after opening the country panel (click the toggle) to assess flag container overflow and confirm no horizontal scrollbar appears.

If you'd like, I can:

- Implement the CSS fixes for card overflow (horizontal and vertical) and add a Playwright test to verify cards fit their containers without scroll.
- Open the country panel in the assessment script and check for flag-related overflow.
- Create a feature branch with the fixes and a smoke test.