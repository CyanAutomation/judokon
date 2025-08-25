import { onDomReady } from "./domReady.js";

/**
 * Mark cards when their hover zoom transition completes.
 *
 * @pseudocode
 * 1. Select all elements with the `.card` or `.judoka-card` class.
 * 2. For each card:
 *    a. Skip if listeners already attached.
 *    b. Remove the `data-zoomed` marker on `mouseenter` and `mouseleave`.
 *    c. When a `transitionend` event for `transform` fires, set `data-zoomed="true"`.
 *    d. If `prefers-reduced-motion` is enabled, set `data-zoomed="true"` immediately on `mouseenter`.
 */
export function addHoverZoomMarkers() {
  if (typeof document === "undefined") return;
  const cards = document.querySelectorAll(".card, .judoka-card");
  cards.forEach((card) => {
    if (card.dataset.zoomListenerAttached) return;
    card.dataset.zoomListenerAttached = "true";
    const reset = () => {
      delete card.dataset.zoomed;
    };
    card.addEventListener("mouseenter", () => {
      reset();
      try {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          card.dataset.zoomed = "true";
        }
      } catch {}
    });
    card.addEventListener("mouseleave", reset);
    card.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") {
        card.dataset.zoomed = "true";
      }
    });
  });
}

onDomReady(() => addHoverZoomMarkers());
