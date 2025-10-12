/**
 * Set SVG fallbacks once the DOM is ready.
 *
 * @pseudocode
 * 1. Wait for the `DOMContentLoaded` event.
 * 2. Call `applySvgFallback` with the fallback logo path.
 */
import { applySvgFallback } from "./svgFallback.js";

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    applySvgFallback("../assets/images/judokonLogoSmall.png");
  });
}
