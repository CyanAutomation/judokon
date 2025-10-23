import { onDomReady } from "./domReady.js";

/**
 * Clear legacy hover-zoom data markers so CSS-driven scaling can handle the
 * visual state without JavaScript listeners.
 *
 * @pseudocode
 * 1. Abort when the DOM is unavailable (e.g. server-side rendering).
 * 2. Query for any elements that previously stored `data-enlarge-*` markers.
 * 3. Remove the legacy attributes so hover styles are controlled purely by CSS.
 * 4. Run this cleanup once the DOM is ready.
 *
 * Contract:
 * - Input: none (reads DOM).
 * - Output: side-effects (removes obsolete data attributes).
 * - Errors: ignore DOM access failures so non-browser environments remain safe.
 *
 * Edge cases:
 * - If no legacy attributes exist the function is a no-op.
 * - Callers may invoke repeatedly; the cleanup remains idempotent.
 *
 * @returns {void}
 */
export function clearLegacyHoverZoomMarkers() {
  if (typeof document === "undefined") return;

  const legacyMarkers = document.querySelectorAll(
    "[data-enlarge-listener-attached], [data-enlarged]"
  );
  legacyMarkers.forEach((element) => {
    element.removeAttribute("data-enlarge-listener-attached");
    element.removeAttribute("data-enlarged");
  });
}

onDomReady(() => clearLegacyHoverZoomMarkers());
