import { onDomReady } from "./domReady.js";

/**
 * Mark cards when their hover zoom transition completes.
 *
 * @pseudocode
 * 1. Select all elements with the `.card` or `.judoka-card` class.
 * 2. For each card:
 *    a. Skip if listeners already attached.
 *    b. Remove the `data-enlarged` marker on `mouseenter` and `mouseleave`.
 *    c. On `mouseenter`, if animations are disabled, set `data-enlarged="true"` immediately.
 *    d. When a `transitionend` event for `transform` fires, set `data-enlarged="true"`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
