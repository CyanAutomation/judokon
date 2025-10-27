# QA & Improvement Plan for Browse Judoka Page

## 1. Executive Summary

This document summarizes the QA findings for the "Browse Judoka" page (`src/pages/browseJudoka.html`) and presents a prioritized, actionable fix plan. The key issues involve a broken country filter panel, incorrect card layouts, and several accessibility gaps.

The plan integrates findings from both manual QA and an automated Playwright layout assessment. Each item includes specific file paths and recommended code changes to accelerate development.

**Priority Order:**

1. **Critical:** Fix the country filter panel, which is currently unusable.
2. **High:** Correct the judoka card layout to prevent scrolling and data truncation.
3. **Medium:** Address accessibility issues related to tap targets and keyboard navigation.
4. **Low:** Implement error handling and add `data-testid` attributes for robustness.

---

## 2. Revised Fix Plan & Improvement Opportunities

### Phase 1: Critical - Country Filter Panel

This phase addresses the highest-priority bugs preventing users from filtering the judoka roster.

- **Issues:**
  1. **Horizontal scroll breaks the flag picker.** (Manual QA)
  2. **The flag row disappears and becomes unusable.** (Manual QA)
  3. **Clicking a flag does not filter the roster.** (Manual QA)
  4. **Flags are not alphabetized.** (Manual QA)

- **Relevant Files:**
  - **HTML:** `src/pages/browseJudoka.html` (contains `#country-list` container)
  - **CSS:** `src/styles/layout.css`, `src/styles/navbar.css`
  - **JavaScript:**
    - `src/helpers/countrySlider.js` (builds the slider)
    - `src/helpers/country/list.js` (populates flags)
    - `src/helpers/browse/setupCountryFilter.js` (handles filter logic)

- **Acceptance Criteria:**
  - The country flag panel must **never** show a horizontal scrollbar.
  - Clicking a flag filters the judoka carousel to matching judoka and resets the carousel index.
  - Flags are alphabetized by their displayed country name.

- **Actionable Fixes:**
  - [x] **Disable Horizontal Scrolling (CSS):** In `src/styles/layout.css` or `src/styles/navbar.css`, modify the styles for `.country-flag-slide-track` (or `#country-list`) to prevent horizontal scrolling and allow wrapping.

    ```css
    /* In src/styles/layout.css or a more specific stylesheet */
    #country-list {
      display: flex;
      flex-wrap: wrap; /* Allow flags to wrap to the next line */
      overflow-x: hidden; /* Explicitly prevent horizontal scrolling */
      gap: 8px; /* Add a small gap between flags */
    }
    ```

    **Rationale:** `overflow-x: hidden` is critical to prevent the accidental mouse-wheel gesture that currently breaks the component.
    - Implemented by wrapping and hiding horizontal overflow on `.country-flag-slide-track` in `src/styles/layout.css`.
    - Validation: `npx vitest run tests/helpers/browseJudokaPage.test.js`, `npx playwright test playwright/browse-judoka.spec.js`.

  - [ ] **Implement Filtering Logic (JavaScript):** In `src/helpers/browse/setupCountryFilter.js`, ensure the event handler correctly identifies the selected country and triggers a data update for the carousel.

    ```javascript
    // In src/helpers/browse/setupCountryFilter.js
    // ... inside the click handler ...
    const button = findButtonFromEvent(event.target);
    if (button) {
      const countryCode = button.dataset.countryCode;
      // This event should be handled by the main page logic to re-render the carousel
      window.dispatchEvent(new CustomEvent("filterByCountry", { detail: { countryCode } }));
    }
    ```

  - [ ] **Alphabetize Flags (JavaScript):** In `src/helpers/country/list.js`, sort the country data before rendering the flag buttons.

    ```javascript
    // In src/helpers/country/list.js, before creating buttons
    countries.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
    );
    ```

- **Verification:**
  - Confirm no horizontal scrollbar appears on the flag panel at any viewport size.
  - Click a flag and verify the carousel updates correctly.
  - Confirm the "No judoka found" message appears for empty results.

### Phase 2: High - Judoka Card Layout

This phase addresses layout bugs on the judoka cards that hide information and violate design requirements.

- **Issues:**
  1. **Card stats require vertical scrolling.** (Manual QA & Playwright Assessment)
  2. **Cards have horizontal overflow.** (Playwright Assessment)
  3. **Center card enlargement is not noticeable.** (Manual QA)
  4. **Page markers are difficult to see.** (Manual QA)

- **Relevant Files:**
  - **CSS:** `src/styles/card.css`, `src/styles/carousel.css`
  - **JavaScript:** `src/helpers/carousel/structure.js` (if programmatic style changes are needed)

- **Acceptance Criteria:**
  - Judoka cards display all stats without any internal scrollbars on viewports >= 1024px.
  - The focused, center card is scaled to at least `1.08`.
  - Carousel page markers have a clear active state and are announced by screen readers.

- **Actionable Fixes:**
  - [ ] **Fix Card Scrolling (CSS):** In `src/styles/card.css`, adjust the card layout for desktop viewports.

    ```css
    /* In src/styles/card.css, inside a @media (min-width: 1024px) block */
    .judoka-card .card-stats {
      overflow-y: hidden; /* Prevent vertical scroll */
      /* Adjust padding, line-height, or font-size to fit content */
      padding: 8px;
      line-height: 1.3;
    }
    .judoka-card {
      overflow: hidden; /* Prevent horizontal scroll */
    }
    ```

  - [ ] **Increase Center Card Scale (CSS):** In `src/styles/carousel.css`, increase the scale transform for the active card.

    ```css
    /* In src/styles/carousel.css */
    .card-carousel .judoka-card.is-active {
      transform: scale(1.1); /* Increased from a lower value */
      transition: transform 200ms ease-in-out;
    }
    ```

  - [ ] **Improve Page Markers:** Add a visually hidden `aria-live` region to `src/pages/browseJudoka.html` that is updated by the carousel logic in `src/game.js` or `src/helpers/browseJudokaPage.js` to announce "Page X of Y".

### Phase 3: Medium - Accessibility & Usability

- **Issues:**
  1. **Tap targets for icons are too small (24x24px instead of 44x44px).** (Manual QA)
  2. **Country panel cannot be closed with the `Escape` key.** (Manual QA)

- **Relevant Files:**
  - **CSS:** `src/styles/navbar.css`
  - **JavaScript:** `src/helpers/browse/setupCountryToggle.js`

- **Actionable Fixes:**
  - [ ] **Increase Tap Target Size (CSS):** In `src/styles/navbar.css`, use padding to increase the hit area of icon buttons without changing the visual size.

    ```css
    .flag-button,
    .some-other-icon-button {
      /* Visually the icon might be 24x24, but padding makes it easier to tap */
      padding: 10px;
      box-sizing: content-box; /* Ensure padding adds to the size */
    }
    ```

  - [ ] **Add Keyboard Navigation (JavaScript):** In `src/helpers/browse/setupCountryToggle.js`, add an event listener to handle the `Escape` key.

    ```javascript
    // In src/helpers/browse/setupCountryToggle.js
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isPanelOpen()) {
        closePanel(); // Assuming a closePanel function exists
      }
    });
    ```

### Phase 4: Low - Polish & Robustness

- **Issue:** No visible error handling for network failures.
- **Actionable Fixes:**
  - [ ] **Add Error Handling:** In `src/helpers/browseJudokaPage.js`, add a `.catch()` block to the data fetching logic to render an error message if the judoka roster fails to load.
  - [ ] **Add Test IDs:** Add `data-testid` attributes to key interactive elements like filter controls, the carousel, and cards to create more resilient Playwright tests.

---

## 3. Automated Layout Assessment

The Playwright script (`scripts/pw-layout-assess.mjs`) confirmed several layout issues reported by QA:

- **Vertical scroll in cards:** Confirmed.
- **Horizontal overflow in cards:** **New finding.** Individual cards are wider than their containers, a layout bug that needs fixing.

These automated checks provide objective, reproducible validation for the layout fixes proposed above.
