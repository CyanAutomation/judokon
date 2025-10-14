# QA & Improvement Plan for Random Judoka Page

## 1. Executive Summary

This document provides a verified and actionable fix plan for the issues identified in the QA report for the Random Judoka page (`src/pages/randomJudoka.html`). The plan integrates and prioritizes the original QA findings and improvement opportunities into a single, developer-focused guide.

The key issues involve a lack of visual feedback (animations, button press), incorrect fallback behavior on data loading errors, and a failure to respect app-level settings for motion.

**Prioritized Fix Plan:**

1. **High:** Implement correct fallback behavior to always show a card.
2. **Medium:** Enhance UI feedback by adding animations and respecting motion preferences.
3. **Medium:** Fix page-level horizontal scroll caused by the country picker.
4. **Low:** Improve accessibility with live announcements for screen readers.

---

## 2. Prioritized Fix Plan

### Phase 1: High - Robustness & Fallback Behavior

- **Issue:** A network failure results in an error message and a disabled button, leaving the card area blank. The PRD requires a fallback judoka card to be shown.
- **Relevant Files:**
  - **JavaScript:** `src/helpers/randomJudokaPage.js` (handles the draw logic)
  - **JavaScript:** `src/helpers/randomCard.js` (where the error is likely caught)
- **Acceptance Criteria:** When a card fails to load, the UI displays the predefined fallback judoka card along with a non-blocking error notification.
- **Actionable Fix:**
  1. In `src/helpers/randomCard.js` or `randomJudokaPage.js`, modify the `catch` block of the data fetching logic. Instead of just showing an error, call the card rendering function with the fallback judoka data.

     ```javascript
     // In the main draw function in src/helpers/randomJudokaPage.js
     try {
       // ... existing logic to draw a card
     } catch (error) {
       console.error("Failed to draw a random judoka:", error);
       // Instead of just showing an error, render the fallback card.
       const fallbackJudoka = getFallbackJudoka(); // Assuming a function that returns the fallback data
       renderJudokaCard(fallbackJudoka);

       // Show a non-blocking notification to the user.
       showSnackbar("Unable to draw a new card. Showing a fallback.");
     }
     ```

### Phase 2: Medium - UI Feedback & Animations

- **Issue:** Card animations are imperceptible, and the "Draw Card" button lacks clear press feedback. The app-level "Reduced Motion" setting is ignored.
- **Relevant Files:**
  - **CSS:** `src/styles/randomJudoka.css`
  - **JavaScript:** `src/helpers/randomJudokaPage.js`
- **Acceptance Criteria:**
  - A clear slide-in or fade-in animation occurs when a new card is drawn.
  - The "Draw Card" button visibly scales down on press.
  - All animations are disabled if either the OS `prefers-reduced-motion` media query is active or the in-app setting is toggled off.
- **Actionable Fixes:**
  1. **Add CSS Animations:** In `src/styles/randomJudoka.css`, define keyframes for the card animation.

     ```css
     @keyframes slideInFadeIn {
       from {
         opacity: 0;
         transform: translateY(20px);
       }
       to {
         opacity: 1;
         transform: translateY(0);
       }
     }

     .judoka-card.new-card {
       /* Apply this class when a new card is rendered */
       animation: slideInFadeIn 0.4s ease-out;
     }

     @media (prefers-reduced-motion: reduce) {
       .judoka-card.new-card {
         animation: none;
       }
     }
     ```

  2. **Improve Button Feedback:** In `src/styles/randomJudoka.css`, make the active state more pronounced.

     ```css
     .draw-button:active {
       transform: scale(0.95); /* Increase scale effect */
       transition: transform 100ms ease-out;
     }
     ```

  3. **Respect App Settings:** In `src/helpers/randomJudokaPage.js`, before triggering the animation, check the application setting.

     ```javascript
     // In the rendering logic within src/helpers/randomJudokaPage.js
     import { getFeatureFlag } from "../helpers/settingsCache.js"; // Or equivalent settings helper

     const motionEnabled = !getFeatureFlag("reducedMotion"); // Check your actual flag name
     const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

     if (motionEnabled && !prefersReducedMotion) {
       newCardElement.classList.add("new-card");
     }
     ```

### Phase 3: Medium - Layout & Responsive Bugs

- **Issue:** The country picker causes page-level horizontal scroll on narrow viewports.
- **Relevant Files:**
  - **CSS:** The stylesheet that defines `.country-picker` and its children (likely a shared component stylesheet).
- **Acceptance Criteria:** The country picker is internally scrollable but never causes the main page body to scroll horizontally.
- **Actionable Fix:**
  1. Apply CSS rules to the picker's container and its internal list to manage overflow correctly.

     ```css
     /* On the main picker container */
     .country-picker-container {
       overflow-x: hidden;
       max-width: 100%;
     }

     /* On the inner list of flags */
     .country-picker-list {
       display: flex;
       overflow-x: auto; /* Allow this element to scroll internally */
       -webkit-overflow-scrolling: touch;
       scrollbar-width: none; /* Hide scrollbar for a cleaner look */
     }
     .country-picker-list::-webkit-scrollbar {
       display: none;
     }
     ```

### Phase 4: Low - Accessibility

- **Issue:** Screen readers do not announce when a new card is drawn.
- **Relevant Files:**
  - **HTML:** `src/pages/randomJudoka.html`
  - **JavaScript:** `src/helpers/randomJudokaPage.js`
- **Acceptance Criteria:** When a new judoka card is rendered, a screen reader announces the name of the new judoka.
- **Actionable Fix:**
  1. **Add ARIA Live Region:** In `src/pages/randomJudoka.html`, add a visually hidden `aria-live` region.

     ```html
     <div class="sr-only" aria-live="polite" id="card-announcer"></div>
     ```

  2. **Update Announcer on Draw:** In `src/helpers/randomJudokaPage.js`, after a new card is rendered, update the content of the announcer element.

     ```javascript
     // In the function that renders the new card
     const announcer = document.getElementById("card-announcer");
     if (announcer) {
       announcer.textContent = `New card drawn: ${judoka.name}`;
     }
     ```

---

## 3. Next Steps

This revised plan is now ready for your review. I have consolidated the QA findings into a prioritized and actionable plan with specific implementation details.

Please let me know which fixes you want me to prioritize, or say **"proceed with the plan"** and I will start by implementing the high-priority fallback behavior from Phase 1.
