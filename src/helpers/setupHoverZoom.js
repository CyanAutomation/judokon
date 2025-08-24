import { onDomReady } from "./domReady.js";

/**
 * Mark cards when their hover zoom transition completes.
 *
 * @pseudocode
 * 1. Select all elements with the `.card` class.
 * 2. For each card:
 *    a. Remove the `data-zoomed` marker on `mouseenter` and `mouseleave`.
 *    b. When a `transitionend` event for `transform` fires, set `data-zoomed="true"`.
 */
export function addHoverZoomMarkers() {
  if (typeof document === "undefined") return;
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const reset = () => {
      delete card.dataset.zoomed;
    };
    card.addEventListener("mouseenter", reset);
    card.addEventListener("mouseleave", reset);
    card.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") {
        card.dataset.zoomed = "true";
      }
    });
  });
}

onDomReady(() => addHoverZoomMarkers());
