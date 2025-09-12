# Audit and Improvement Plan for `src/pages/battleCLI.html`

**Scope:** This document provides a static code audit of `src/pages/battleCLI.html` focusing on accessibility, semantics, CSS, and alignment with repository standards. It includes a proposed plan to address the findings.

## Overall Assessment

The `battleCLI.html` file is generally well-structured and test-friendly, with thoughtful ARIA usage and clear DOM anchors. However, several opportunities for improvement exist in accessibility, CSS organization, and theming implementation that will enhance maintainability and user experience.

## Detailed Findings and Recommendations

### 1. Accessibility and Semantics

*   **Overuse of Live Regions:** Multiple elements are marked `aria-live="polite"`, which can cause screen readers to make duplicate or confusing announcements.
    *   **Recommendation:** Consolidate live regions. Keep `#round-message` as the primary live region and set others to `aria-live="off"` or remove the attribute unless a specific announcement is required.

*   **Incorrect Role for Prompt:** The `#cli-prompt` element uses `role="textbox"` but is not an interactive input.
    *   **Recommendation:** Remove the `role` attribute or change it to a non-interactive role like `status`.

*   **Incorrect Listbox Semantics:** The `#cli-stats` container has `role="listbox"`, but its skeleton-loader children are `<div>`s without the required `role="option"`.
    *   **Recommendation:** While skeleton items are shown, add `aria-busy="true"` to the `#cli-stats` container and give the skeleton `<div>`s `role="presentation"`. When the actual stat options are rendered, ensure each has `role="option"` and state attributes like `aria-selected`.

*   **Missing `aria-expanded` Toggling:** The help panel's close button (`#cli-shortcuts-close`) has a static `aria-expanded="false"`. This state should be dynamically updated by JavaScript when the panel is shown or hidden.
    *   **Recommendation:** Ensure the JavaScript that controls the help panel's visibility also toggles the `aria-expanded` attribute on the control button.

*   **Input Accessibility:** The seed input (`#seed-input`) lacks a connection to its error message container.
    *   **Recommendation:** Add `aria-describedby="seed-error"` to the input to associate it with the error display.

### 2. CSS and Styling

*   **Duplicate CSS Rules:** The `.cli-stat` class is defined twice in the stylesheet with conflicting properties.
    *   **Recommendation:** Consolidate the styles into a single, authoritative `.cli-stat` rule.

*   **Misapplied CSS Rule:** The `.state-badge` class has a `min-height: 8rem`, which is excessively large for a header element and will disrupt the layout.
    *   **Recommendation:** Remove the `min-height: 8rem` rule from `.state-badge`.

*   **Unused CSS:** The stylesheet contains rules for an element with the ID `#start-match-button`, but this element does not exist in the HTML.
    *   **Recommendation:** Remove the unused CSS for `#start-match-button`.

*   **Inline Styles:** Several elements, particularly in the settings and shortcuts sections, use inline `style` attributes.
    *   **Recommendation:** Move all inline styles to dedicated CSS classes to improve maintainability and adhere to content/presentation separation.

### 3. Theming and Feature Flags

*   **Conflicting Theme Classes:** The `<body>` element has `class="cli-retro cli-immersive"` hard-coded, while a script also adds these classes based on `localStorage` flags. This is redundant and can lead to unpredictable behavior.
    *   **Recommendation:** Remove the hard-coded classes from the `<body>` tag and rely solely on the initialization script to set the theme based on user flags or a single default.

## Proposed Implementation Plan

I will now execute the following plan to address the issues identified above.

1.  **Refactor Accessibility & Semantics:**
    *   Adjust `aria-live` attributes, consolidating to a single primary region.
    *   Correct the `role` on the `#cli-prompt` element.
    *   Add `aria-busy="true"` to the stats listbox and `role="presentation"` to the skeleton loaders.
    *   Add `aria-describedby` to the seed input.

2.  **Refactor CSS:**
    *   Merge the duplicate `.cli-stat` style blocks.
    *   Remove the `min-height` from `.state-badge`.
    *   Remove the unused styles for `#start-match-button`.
    *   Extract all inline `style` attributes into new CSS classes.

3.  **Refactor Theming:**
    *   Remove the hard-coded `cli-retro` and `cli-immersive` classes from the `<body>` element.

4.  **Validation:**
    *   After applying the changes, run the project's validation suite to ensure no regressions have been introduced.