QA report for src/pages/browseJudoka.md

| Issue                                                            | Steps to reproduce                                                                                                                                                                                                                                                                        | Impact                                                                                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Country flag picker becomes unusable after horizontal scroll** | 1. Click the **Country filter** toggle (first red icon).  2. When the slide‑out panel appears, use a horizontal scroll gesture (mouse‑wheel left/right) on the flag row.  3. The flag row disappears, leaving an empty panel. There is no way to scroll back, so no flags are selectable. | Users can accidentally hide the country selector and cannot filter by country. The panel becomes blank, so players cannot pick or change countries.                |
| **Selecting a flag does not filter the roster**                  | 1. Open the country panel.  2. Click any flag (e.g., the Portugal flag).  3. The panel briefly shows a larger version of the clicked flag, but the card carousel does not update; all judoka remain visible.                                                                              | Filtering appears non‑functional, preventing players from narrowing the roster by country. This fails acceptance criteria requiring country filter to limit cards. |
| **Card stats require vertical scrolling**                        | Each card container includes its own vertical scroll bar. On desktop at 1024 px width, users must scroll within a card to see the bottom of the stats section. The PRD states that judoka cards should “display all stats without scrolling on common desktop resolutions”.               | Usability & accessibility issue; players may not realize additional stats exist below the fold.                                                                    |
| **Center card not clearly enlarged**                             | The PRD specifies that the focused (center) card should be enlarged by ~10%. In the current build, the enlargement on focus/hover is subtle and almost imperceptible.                                                                                                                     | The intended “binder‑like” feeling and focus cue are lost, reducing visual polish and accessibility.                                                               |
| **Page marker highlight difficult to interpret**                 | The page markers below the carousel are tiny dots with only a slight color change. They do not announce updates via an `aria-live` region as required.                                                                                                                                    | Screen‑reader users may not get feedback about their position in the carousel, and sighted players may have difficulty seeing which page is active.                |
| **Country flags not obviously alphabetized**                     | The flag row shows countries in an order that does not match alphabetical sorting (e.g., Suriname, Georgia, Jamaica, Portugal appear together). The PRD mandates alphabetical ordering.                                                                                                   | Inconsistent ordering makes it harder for players to find their country and conflicts with the acceptance criteria.                                                |
| **Tooltip and icons on small screens**                           | The panel toggle, clear filter and navigation buttons appear small (~24 px). The PRD calls for a minimum tap‑target size of 44×44 px.                                                                                                                                                     | Touch users may find it difficult to tap the small icons accurately.                                                                                               |
| **No visible error handling**                                    | Disconnecting from the network during testing did not show an “Unable to load roster” message or retry button, though the PRD specifies this for network failures.                                                                                                                        | Players experiencing connectivity issues might see a blank screen without guidance.                                                                                |
| **Keyboard closing of country panel not evident**                | The panel does not indicate that pressing `Escape` closes it; only clicking the toggle hides it. This diverges from the requirement that the panel support closing via Escape.                                                                                                            | Keyboard‑only users may struggle to dismiss the panel once opened.                                                                                                 |

### Revised Fix Plan & Improvement Opportunities

This plan addresses the issues identified in the QA report with specific, actionable steps.

#### 1. Country Filter Panel

*   **Issue:** Horizontal scroll breaks the flag picker; filtering is non-functional; flags are not alphabetized.
*   **Fixes:**
    *   **Disable Horizontal Scroll & Improve Layout:** The primary issue is the horizontal scroll. To fix this, apply the following CSS to the flag container:
        ```css
        .flag-container {
          display: flex;
          flex-wrap: wrap; /* Allow flags to wrap to the next line */
          overflow-x: hidden; /* Prevent horizontal scrolling entirely */
          justify-content: flex-start;
        }
        ```
        This will make the flags wrap onto new lines instead of creating a horizontal scrollbar.
    *   **Implement Filtering Logic:** Connect the flag selection to the card carousel. When a flag is clicked, update the carousel to show only judoka from that country. If no judoka match, display a message like "No judoka found for this country."
    *   **Alphabetize Flags:** Sort the country data source before rendering the flags. Use `String.prototype.localeCompare()` for proper alphabetical sorting across different languages.
        ```javascript
        countries.sort((a, b) => a.name.localeCompare(b.name));
        ```
*   **Verification:**
    *   Confirm that the country flag panel has no horizontal scrollbar.
    *   Verify that clicking a flag filters the judoka cards correctly.
    *   Check that the flags are displayed in alphabetical order.

#### 2. Judoka Card Carousel

*   **Issue:** Cards have internal scrollbars; center card enlargement is not noticeable; page markers are unclear.
*   **Fixes:**
    *   **Adjust Card Layout:** Modify the CSS for the judoka cards to ensure all stats are visible without scrolling on desktop. This might involve adjusting padding, font size, or using a more compact layout.
    *   **Enhance Center Card Enlargement:** Increase the `transform: scale()` value for the focused card to at least `1.1` to make the effect clear. Ensure a smooth `transition` is applied to the `transform` property.
    *   **Improve Page Markers:** Increase the size and visual distinction of the active page marker. Use an `aria-live` region to announce page changes to screen readers (e.g., "Page 2 of 5").
*   **Verification:**
    *   Check that cards on desktop (e.g., 1024px width) do not have a vertical scrollbar.
    *   Confirm the center card is visibly larger than other cards.
    *   Verify that page markers are clear and that screen readers announce changes.

#### 3. Accessibility & Usability

*   **Issue:** Small tap targets; keyboard navigation is missing for the country panel.
*   **Fixes:**
    *   **Increase Tap Target Size:** Ensure all interactive elements (buttons, toggles) have a minimum size of 44x44 pixels as per WCAG guidelines.
    *   **Implement Keyboard Navigation:**
        *   Add a `keydown` event listener to the document when the country panel is open.
        *   If the `Escape` key is pressed, close the panel.
        *   Allow the panel to be opened and closed with `Enter` or `Space` when the toggle button is focused.
        *   Ensure focus is trapped within the panel when it is open.
*   **Verification:**
    *   Use browser developer tools to inspect the size of tap targets.
    *   Test keyboard navigation: open, close, and navigate within the country panel using only the keyboard.

#### 4. General Polish & Robustness

*   **Issue:** No error handling for network failures.
*   **Fixes:**
    *   **Add Error Handling:** When fetching judoka data, implement a `.catch()` block to handle network errors. If an error occurs, display a user-friendly message and a "Retry" button.
    *   **Add Test IDs:** Add `data-testid` attributes to key elements like the filter buttons, carousel pages, and individual cards to make them easier to target in Playwright tests.
*   **Verification:**
    *   Use browser developer tools to simulate offline mode and verify that the error message is displayed.
    *   Inspect the DOM to confirm that `data-testid` attributes have been added.