import { onDomReady } from "./domReady.js";

/**
 * Mark cards when their hover enlargement transition completes.
 *
 * @pseudocode
 * 1. Select all elements with the `.card` class.
 * 2. Detect whether reduced motion is preferred or tests disable animations.
 * 3. For each card:
 *    a. Optionally disable transition when animations are disabled.
 *    b. Remove the `data-enlarged` marker on `mouseenter` and `mouseleave`.
 *    c. Immediately set `data-enlarged="true"` on `mouseenter` when animations are disabled.
 *    d. When a `transitionend` event for `transform` fires, set `data-enlarged="true"`.
 */
export function addHoverZoomMarkers() {
  if (typeof document === "undefined") return;
  const cards = document.querySelectorAll(".card");

  let prefersReducedMotion = false;
  try {
    prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {}
  const disableAnimations = document.documentElement.hasAttribute("data-test-disable-animations");

  cards.forEach((card) => {
    if (prefersReducedMotion || disableAnimations) {
      card.style.transition = "none";
    }
    const reset = () => {
      delete card.dataset.enlarged;
    };
    card.addEventListener("mouseenter", () => {
      reset();
      if (prefersReducedMotion || disableAnimations) {
        card.dataset.enlarged = "true";
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
