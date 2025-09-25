import { onDomReady } from "./domReady.js";

/**
 * Attach hover/transition listeners to card elements so the UI can mark when
 * the hover-zoom enlargement has completed.
 *
 * @pseudocode
 * 1. Query the document for all elements matching `.card` and `.judoka-card`.
 * 2. For each card element:
 *    a. If `data-enlarge-listener-attached` is present, skip to avoid duplicate listeners.
 *    b. Mark the element as having listeners attached.
 *    c. Add a `mouseenter` listener that clears `data-enlarged` and checks
 *       for reduced-motion, a test-disable attribute, or existing keyboard focus;
 *       if any are true, set `data-enlarged="true"` immediately so no animation is needed.
 *    d. Add a `mouseleave` listener that removes the `data-enlarged` marker.
 *    e. Add a `transitionend` listener that, when the `transform` property finishes,
 *       sets `data-enlarged="true"` to indicate enlargement completed.
 * 3. Use a DOM-ready helper to run this wiring at startup.
 *
 * Contract:
 * - Input: none (reads DOM).
 * - Output: side-effects (event listeners and data attributes on elements).
 * - Errors: silently ignore DOM exceptions in non-browser environments.
 *
 * Edge cases:
 * - Elements added after initial run won't be wired; callers can call this function again.
 * - In test environments the body may be missing; use defensive checks.
 *
 * @returns {void}
 */
export function addHoverZoomMarkers() {
  if (typeof document === "undefined") return;
  const cards = document.querySelectorAll(".card, .judoka-card");
  cards.forEach((card) => {
    if (card.dataset.enlargeListenerAttached) return;
    card.dataset.enlargeListenerAttached = "true";
    const reset = () => {
      delete card.dataset.enlarged;
    };

    // Keyboard users should immediately see the enlarged state once they hover a focused card.
    const hasKeyboardFocus = () => {
      try {
        if (card.matches(":focus-visible")) return true;
      } catch {}
      try {
        return card === document.activeElement && card.matches(":focus");
      } catch {
        return card === document.activeElement;
      }
    };

    card.addEventListener("mouseenter", () => {
      reset();
      try {
        const reduceMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const disableAnimations = document.body?.hasAttribute("data-test-disable-animations");
        if (reduceMotion || disableAnimations) {
          card.dataset.enlarged = "true";
        }
      } catch {
        // If reduced-motion or test flags can't be read, still honor keyboard focus for accessibility.
        if (hasKeyboardFocus()) {
          setEnlarged();
        }
      }
    });
    card.addEventListener("mouseleave", reset);
    card.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") {
        card.dataset.enlarged = "true";
      }
    });
  });
}

onDomReady(() => addHoverZoomMarkers());
