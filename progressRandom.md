# QA Report for src/pages/randomJudoka.html

## Issues Summary

| Issue                                             | Steps to reproduce                                                           | Observations vs. PRD                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Animation not clearly sliding/fading**          | Tap **Draw Card!** repeatedly                                                | Cards appear almost instantly with little or no visible slide/fade animation. The PRD calls for a slide‑in or fade‑in animation for the card reveal. The minimal animation might be due to extremely fast execution or missing CSS; a more noticeable motion (while respecting Reduced Motion) could better match the specification.      |
| **Button press feedback is subtle**               | Click and hold the Draw button                                               | The PRD requires a slight scale‑in (~95%) on press. In practice, the scale effect is barely noticeable, especially on desktop. Users might not perceive that the button was pressed.                                                                                                                                                      |
| **No explicit fallback card message**             | Disconnect network or imagine data load failure (cannot easily test offline) | The code provides a fallback judoka if the list fails to load, but the UI currently shows only an error message (“Unable to draw card. Please try again later”) and disables the button. The PRD suggests showing a placeholder/fallback card so the screen never feels broken.                                                           |
| **Reduced Motion toggle in settings not applied** | Disable motion in `settings.html` (global preference) then draw              | Only OS-level `prefers-reduced-motion` is respected. There is no check for the global motion setting defined in `settings.html`. Task 4.1 (“honor animation preference from settings.html”) is marked incomplete.                                                                                                                         |
| **Responsiveness not fully verified**             | Resize the browser window to <600px or test landscape orientation            | CSS attempts to reposition controls, but manual checks are needed. On smaller widths the Draw button can overlap the card or the footer may hide it; this requires responsive QA (tasks 7.1–7.2 remain open).                                                                                                                             |
| **Contrast and tap‑target verification pending**  | Use automated accessibility tools                                            | The PRD notes that WCAG contrast and tap targets must be verified manually. While colours appear sufficient and tap targets meet the 64 px guideline, an automated audit would confirm compliance.                                                                                                                                        |
| **Country picker horizontal scroll present**      | Open the country picker slider (mobile / narrow viewport)                    | The country picker slider currently allows horizontal scrolling of the whole page (overflow-x). The PRD requires the slider to be contained without causing page-level horizontal scroll. This appears to be caused by an overflowing child (likely the slider track or nav) or missing overflow/width rules on the picker container.|

---

## Improvement Opportunities

- **Enhance animation feedback.** Ensure cards slide or fade in as described and that the draw button scales on press. Consider adding a micro‑delay (~200 ms) so animations are perceptible without feeling slow. Use prefers-reduced-motion and a global motion preference to disable these effects when necessary.
- **Display a fallback card rather than only an error message.** When data loading fails, show the pre‑defined fallback judoka card along with a subtle notification. This satisfies the requirement to never leave the card area blank.
- **Support global motion and sound preferences.** Read user settings from settings.html (as referenced in the PRD) and apply them alongside OS-level reduced‑motion detection.
- **Improve accessibility announcements.** Add an aria-live="polite" region around the card container so screen readers announce the newly drawn judoka. Announce errors (e.g., when fallback is used) via role="alert" to inform assistive‑technology users.
- **Responsive QA.** Test the layout on narrow mobile devices and landscape orientation to ensure the Draw button remains visible above the footer, as specified. Adjust flexbox properties or use media queries to avoid overlap or clipping.
- **Unit and UI tests.** Implement deterministic random tests and Playwright scenarios to verify auto‑draw, draw flow, fallback behaviour, and accessibility (Tasks 8.1–8.2 are currently unchecked). This will prevent regressions.
- **Align with global UI design standards.** Compare colours, typography and spacing with codeUIDesignStandards.md. For example, ensure consistent shadow depths, border radii and hover/active states across all buttons.

---

## Country Picker Horizontal Scroll

### Feasibility & Suggested Fix

The country picker horizontal-scroll bug is straightforward to fix in most cases. It happens when an element inside the picker (track, list, or buttons) is wider than the viewport or when the picker container doesn't constrain overflow. Fixing this typically requires small CSS changes and a short test matrix.

### Minimal CSS fix (apply to the picker container / slider)

```css
/* Ensure the picker doesn't create page-level horizontal scroll */
.country-picker, /* container */
.country-picker__track { /* inner track */
	max-width: 100%;
	box-sizing: border-box;
	overflow-x: hidden; /* prevent track from pushing page width */
}

/* If the picker is a horizontal scroller, keep the inner scrolling region isolated */
.country-picker__list {
	display: flex;
	gap: 8px;
	overflow-x: auto; /* allow internal scrolling only */
	-webkit-overflow-scrolling: touch;
}

/* Prevent the list from causing the page to overflow */
.country-picker__list > * {
	flex: 0 0 auto; /* keep children from growing beyond intrinsic size */
	max-width: 100%;
}
```

### Notes on the CSS above:
- Set `overflow-x: hidden` on the outer container so large children cannot expand the page width.
- Keep the internal list scrollable (`overflow-x: auto`) so users can swipe through countries without the whole page scrolling horizontally.
- Use `box-sizing` and `max-width` to ensure elements measure against the viewport rather than their content.

### Suggested implementation steps
1.  Locate the country picker markup (likely in `src/components/` or `src/pages/randomJudoka.html`). Identify container, track/list and item class names.
2.  Add the CSS rules above to the component stylesheet (or a local stylesheet for the page). Prefer component-scoped styles if available.
3.  Verify no JavaScript unexpectedly sets inline widths or translates the track beyond viewport bounds. If code manipulates widths/transforms, clamp values to viewport width (`window.innerWidth` or CSS `clamp()`) and prefer transforms within the scroller element (not on the page root).
4.  Test on devices: iPhone/Android Safari/Chrome; and resize desktop to narrow widths. Confirm no page-level horizontal scroll appears while the picker remains horizontally navigable.
5.  Add a Playwright visual/regression spec that opens the picker at a narrow viewport and asserts `body.scrollWidth <= window.innerWidth` (or uses an accessibility snapshot) and that the picker remains usable.

### Acceptance criteria
- No horizontal page scroll when the country picker is open at widths down to 320px.
- The country picker remains horizontally navigable via touch-drag or trackpad; internal scrolling does not affect the page scroll position.
- No layout shift or overflow flashes on picker open/close.

### Tests to add
- **Unit:** Render the picker in a JSDOM environment and assert `container.scrollWidth <= container.clientWidth` when styles are applied (this can be brittle in JSDOM; prefer an integration test).
- **Playwright:** At 375x812 viewport, open the random page, open the picker, and assert page-level horizontal scroll is not present (compare `body.scrollWidth` and viewport width). Optionally take a screenshot for visual assertion.
- **Accessibility:** Ensure picker items have accessible labels and that internal scrolling region has proper keyboard focus handling (tab order) and focus styles.

### Risks & mitigations
- **Risk:** JavaScript code that sets explicit pixel widths or translates the track may continue to cause overflow.
- **Mitigation:** update JS to compute sizes relative to container width and use `clamp()` or `Math.min(window.innerWidth, computedWidth)`.
- **Risk:** Cross-browser scrolling differences (iOS bounce/overscroll).
- **Mitigation:** test on real devices and use `-webkit-overflow-scrolling: touch` for smooth scrolling; add `overscroll-behavior-x: contain` if necessary.

---

## Report Summary

### What I changed in this report
- Added the missing country-picker horizontal scroll issue and a focused, actionable fix plan.
- Provided minimal CSS to prevent page-level horizontal scroll while preserving internal horizontal navigation for the picker.
- Expanded the tests, acceptance criteria and risks to make the fix verifiable and safer to implement.

### Next steps (what I will do after your review)
1.  If you confirm, I can implement the CSS changes in the repository and run Playwright checks locally (or add a test and a PR with the fix).
2.  If you prefer, I can search for the picker components and propose the exact class names and file edits before applying the patch.
3.  I can also add the Playwright test described above and run the test suite to verify no regressions.