# QA Report & Fix Plan: Random Judoka Page

This report summarizes accessibility and user experience issues identified during the quality assurance (QA) process for the Random Judoka page. All findings have been verified against the current codebase, and this document proposes a concrete, feasible plan for remediation.

## 1. QA Findings

The following table details the issues found, evidence from the codebase, and their potential impact on users.

| Issue                                      | Evidence / Reproduction                                                                                                                                                                                                   | Impact                                                                                                                                                                 |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Screen-reader announces "undefined"**    | `displayCard()` in `src/helpers/randomJudokaPage.js` calls `announceCard(announcedJudoka.name)`. However, the judoka objects from `generateRandomCard()` provide `firstname` and `surname`, not a single `name` property. | **High** – The screen reader announces "New card drawn: undefined," creating a confusing and inaccessible experience for visually impaired users.                      |
| **Partial handling of global settings**    | The page correctly reads the `prefers-reduced-motion` media query but does not consistently respect the application's own sound/motion toggles from the settings page.                                                    | **Medium** – Users who disable motion or sound in the settings may still encounter animations, leading to an inconsistent experience.                                  |
| **Internal scrolling within card**         | The `.judoka-card` CSS sets a fixed height, causing content overflow and an internal scrollbar on cards with longer text, especially on narrow viewports.                                                                 | **Medium** – Key information like stats or bios can be hidden, harming readability and requiring non-intuitive scrolling within the card.                              |
| **Incomplete reduced-motion coverage**     | While some animations are disabled via `@media (prefers-reduced-motion: reduce)`, other CSS transitions (e.g., button hover effects, history panel transforms) are not covered.                                           | **Medium** – Users with motion sensitivities may still experience distracting movement, defeating the purpose of the accessibility setting.                            |
| **Responsiveness issues on small screens** | On short viewports or in landscape mode, the layout's `min-height` can push the main "Draw" button off-screen or cause it to overlap with other elements.                                                                 | **Medium** – Core functionality becomes unusable if the primary call-to-action button is not visible or accessible.                                                    |
| **Lack of automated checks**               | There are no automated tests to verify WCAG contrast ratios or tap target sizes, creating a risk of regressions.                                                                                                          | **Medium** – Accessibility standards could degrade over time without automated enforcement, potentially affecting users with visual impairments or motor difficulties. |
| **No audio feedback**                      | No audio cues are implemented for card drawing actions, despite a sound toggle being available in the settings.                                                                                                           | **Low** – While listed as optional in the PRD, the absence of sound reduces sensory feedback and polish.                                                               |

---

### Verified & Resolved Items

The initial QA report contained some items that were found to be already implemented or incorrect.

- **Portraits have alt text:** `generateCardPortrait()` in `src/helpers/cardRender.js` correctly generates `alt` text for images.
- **Draw button has `aria-busy`:** The state machine in `src/helpers/drawCardStateMachine.js` correctly applies the `aria-busy` attribute during the drawing state.

## 2. Recommended Fixes & Implementation Plan

The following fixes are recommended to address the identified issues, prioritized by impact.

### Priority 1: High-Impact Accessibility Fixes

1.  **Fix Screen-Reader Announcement:**
    - **Change:** In `src/helpers/randomJudokaPage.js`, modify the `announceCard` call to use the judoka's full name.
    - **Code:** Change `announceCard(announcedJudoka.name)` to `announceCard(`${announcedJudoka.firstname} ${announcedJudoka.surname}`).`
    - **Enhancement:** Add an announcement when the draw begins (e.g., `Drawing card…`) to provide immediate feedback to screen reader users.
    - **Status:** Completed – Added `announceJudoka()` in `src/helpers/randomJudokaPage.js` to build full-name announcements (with fallbacks) and triggered a "Drawing card…" cue as soon as the draw starts. Verified with `npx vitest run tests/helpers/randomJudokaPage.*.test.js` and `npx playwright test random-judoka.spec.js`.

### Priority 2: Medium-Impact UX & Accessibility Fixes

2.  **Stop Internal Card Scrolling:**
    - **Recommendation:** Rework the card and container layout to be flexible (using CSS Grid or Flexbox) so the card can expand vertically as needed.
    - **Alternative:** Truncate long text and provide a "Show More" control to reveal the full content.
    - **Status:** Completed – Updated `src/styles/card.css` to replace the fixed `.judoka-card` height with a flexible `min-height` and `minmax(...)` row tracks, allowing bios and stats to expand without scrollbars. Verified with `npx vitest run tests/helpers/randomJudokaPage.*.test.js` and `npx playwright test random-judoka.spec.js`.

3.  **Ensure Full Reduced-Motion Compliance:**
    - **Change:** Wrap all remaining animations and transitions (button presses, panel slides) in `@media (prefers-reduced-motion: reduce)` queries.
    - **Verification:** Manually test with the OS-level reduced motion setting enabled to confirm all movement has ceased.
    - **Status:** Completed – Updated `src/styles/randomJudoka.css` to disable the draw button press scaling and history panel slide transitions when reduced motion is requested, and set the reduced-motion modifier class to remove the panel transition entirely. Verified with `npx vitest run tests/helpers/randomJudokaPage.*.test.js` and `npx playwright test random-judoka.spec.js`.

4.  **Improve Responsiveness:**
    - **Change:** Anchor the "Draw" button to the viewport (e.g., using `position: sticky` or `position: fixed`) to ensure it remains accessible on all screen sizes and orientations.
    - **Status:** Completed – Refactored `src/styles/randomJudoka.css` so `.card-section` uses a grid layout and the `.draw-controls` block sticks near the bottom of the viewport (with landscape-specific offsets), keeping the "Draw Card" button visible on short viewports. Verified with `npx vitest run tests/helpers/randomJudokaPage.*.test.js` and `npx playwright test random-judoka.spec.js`.

### Priority 3: Polish and Long-Term Health

5.  **Implement Global Settings:**
    - **Sound:** Create a simple `audioUtils.js` helper that checks the global `settings.sound` flag before playing any audio.
    - **Motion:** Ensure all JavaScript-triggered animations are gated by the `settings.motionEffects` flag.
    - **Status:** Completed – Added `audioUtils.js` for settings-aware sound helpers, refreshed `featureFlags` storage syncing so `settingsCache` tracks live updates, and taught `randomJudokaPage` to recompute motion/sound preferences dynamically (including disabling snackbar animations via `body.reduce-motion`). Verified with `npx vitest run tests/helpers/randomJudokaPage.*.test.js` and `npx playwright test random-judoka.spec.js`.

6.  **Add Automated Accessibility Checks:**
    - **Recommendation:** Integrate a runtime accessibility library (like `axe-core`) into the development build to warn about contrast or tap-target violations in the console.
    - **Testing:** Add a Playwright test that specifically runs accessibility checks on the rendered page.

7.  **Enable Deterministic Testing:**
    - **Change:** Expose an optional `seed` parameter to `generateRandomCard()` that can be used only in test environments. This will allow Playwright tests to reproduce specific card sequences reliably.

## 3. Next Steps

I am ready to proceed with implementing the proposed fixes. Please choose one of the following options:

1.  **Apply the highest-priority fix:** I can immediately create a patch to fix the screen-reader announcement, which is a small, low-risk, and high-impact change.
2.  **Implement a different fix:** Let me know if you'd like me to start with another item from the plan.
3.  **Await further instructions:** I will wait for your review and direction.
