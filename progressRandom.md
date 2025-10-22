# QA Report: Random Judoka Page

This report summarizes accessibility and UX issues found on the Random Judoka page (`src/helpers/randomJudokaPage.js`). It verifies the problems present in the codebase and proposes concrete, feasible fixes.

## Summary of Issues

| ID | Issue | Impact | Priority |
|---|---|---|---|
| 1 | Screen-reader announcement may read “undefined” | High | High |
| 2 | Global motion/sound settings handling is partial | Medium | Medium |
| 3 | No audio feedback implemented | Low/Optional | Low |
| 4 | Internal vertical scrolling inside card | Medium | Medium |
| 5 | Reduced-motion should cover more effects | Medium | Medium |
| 6 | Portraits include alt text (Verified) | Low | N/A |
| 7 | Draw button state implements `aria-busy` (Verified) | Low | N/A |
| 8 | Contrast/tap target checks not automated | Medium | Medium |
| 9 | Responsiveness edge cases | Medium | High |

---

## Detailed Analysis and Recommendations

### 1. Screen-Reader Announcement Reads "undefined"

*   **Issue:** The screen reader announcement for a new card says "New card drawn: undefined".
*   **Evidence:** `displayCard()` in `src/helpers/randomJudokaPage.js` calls `announceCard(announcedJudoka.name)`. The judoka objects from `generateRandomCard()` and `pickJudoka()` have `firstname` and `surname` properties, but no `name` property (see `src/data/judoka.json`).
*   **Impact:** This is confusing for screen reader users and reduces accessibility.
*   **Recommendation:**
    *   **Immediate Fix:** Change the call to `announceCard(${announcedJudoka.firstname} ${announcedJudoka.surname})`.
    *   **Long-term Fix:** Add a `name` getter when constructing or normalizing judoka objects.
    *   **Additional Improvement:** Add a live announcement when the draw begins (e.g., "Drawing card…") to provide immediate feedback.

### 2. Global Motion/Sound Settings Handling is Partial

*   **Issue:** The page respects the OS-level `prefers-reduced-motion` setting but does not consistently use the application's global `settings.sound` and `settings.motionEffects` flags.
*   **Evidence:** `randomJudokaPage.js` reads motion preferences via `initFeatureFlags()` and calls `applyMotionPreference()`. However, there are no audio playback calls, and animations are not consistently gated by the global settings.
*   **Impact:** Users who disable motion or sound in the settings may still experience them.
*   **Recommendation:**
    *   **Motion:** Ensure `applyMotionPreference()` is called early and that all animations are wrapped in `@media (prefers-reduced-motion: reduce)` or check `settings.motionEffects` in JavaScript.
    *   **Sound:** Implement a centralized audio helper (e.g., `src/helpers/audioUtils.js`) that checks `settings.sound` before playing any audio.

### 3. No Audio Feedback Implemented

*   **Issue:** There is no sound effect when drawing a card.
*   **Evidence:** No audio API usage (`new Audio()` or `.play()`) was found in the relevant helper files.
*   **Impact:** This is a low-priority issue, but adding sound would improve sensory feedback.
*   **Recommendation:** Implement a short chime (≤1s) that plays on a successful draw, gated by the `settings.sound` flag.

### 4. Internal Vertical Scrolling Inside Card

*   **Issue:** The content of a judoka card can overflow its fixed height, causing internal scrolling or hidden content.
*   **Evidence:** The `.judoka-card` CSS sets a fixed aspect ratio and height, with `overflow-y: visible`. On smaller viewports or with long content, this can lead to overflow.
*   **Impact:** Important information can be hidden from the user, harming readability.
*   **Recommendation:**
    *   **Preferred:** Use a flexible layout (CSS Grid/Flexbox) to allow the card to expand vertically as needed, while keeping controls pinned.
    *   **Alternative:** Truncate long text and provide a "More" button to expand the content.

### 5. Reduced-Motion Should Cover More Effects

*   **Issue:** Not all animations and transitions are disabled when `prefers-reduced-motion` is enabled.
*   **Evidence:** Some CSS transitions (e.g., button scaling, history panel transform) are not wrapped in a `prefers-reduced-motion` media query.
*   **Impact:** Users with motion sensitivity may still experience unwanted movement.
*   **Recommendation:** Wrap all animations and transitions with `@media (prefers-reduced-motion: reduce)` or a similar check in JavaScript.

### 6. Portraits Include Alt Text (Verified)

*   **Issue:** The original report incorrectly stated that portrait images were missing `alt` text.
*   **Evidence:** `generateCardPortrait()` in `src/helpers/cardRender.js` correctly builds an `<img>` with an `alt` attribute: `alt="${escapedFirstname} ${escapedSurname}" `.
*   **Impact:** This is already implemented correctly. No action is needed.

### 7. Draw Button State Implements `aria-busy` (Verified)

*   **Issue:** The original report questioned the implementation of the draw button's loading state.
*   **Evidence:** `createDrawCardStateMachine()` in `src/helpers/drawCardStateMachine.js` correctly sets `aria-busy="true"` during the `DRAWING` and `SUCCESS` states.
*   **Impact:** The basic ARIA implementation is correct. Additional live announcements could further improve clarity.

### 8. Contrast/Tap Target Checks Not Automated

*   **Issue:** There is no automated verification for color contrast and tap target sizes.
*   **Evidence:** The PRD recommends verifying WCAG AA contrast ratios (≥4.5:1), but this is not part of the automated testing process.
*   **Impact:** There is a risk of accessibility failures on some devices or with certain themes.
*   **Recommendation:** Add a runtime contrast check during development builds and include an accessibility audit in the Playwright test suite.

### 9. Responsiveness Edge Cases

*   **Issue:** On very short or narrow viewports (e.g., landscape mode on a phone), the "Draw Card" button can be pushed off-screen.
*   **Evidence:** The layout uses `min-height: 60dvh` for the card container, which can cause the floating draw button to be pushed out of the viewport.
*   **Impact:** Users may be unable to use the main feature of the page.
*   **Recommendation:** Anchor the draw button using `position: sticky` or a fixed footer to ensure it is always visible.

---

## Conclusion and Next Steps

The most critical issues to address are the screen reader announcement bug and the responsiveness problem with the draw button. The other issues are also important for improving the overall user experience and accessibility of the page.

I can proceed with the following actions:

1.  **Fix the screen-reader announcement:** Implement the recommended fix to announce the judoka's full name.
2.  **Implement audio feedback:** Create a simple `audioUtils.js` helper and add a chime for drawing a card.
3.  **Improve reduced-motion coverage:** Audit the CSS and add missing `prefers-reduced-motion` media queries.

Please let me know which of these fixes you would like me to implement, or if you have other instructions.