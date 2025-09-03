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
 *       for reduced-motion or a test-disable attribute; if either is true,
 *       set `data-enlarged="true"` immediately so no animation is needed.
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
    card.addEventListener("mouseenter", () => {
      reset();
      try {
        const reduceMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const disableAnimations = document.body?.hasAttribute("data-test-disable-animations");
        if (reduceMotion || disableAnimations) {
          card.dataset.enlarged = "true";
        }
      } catch {}
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
