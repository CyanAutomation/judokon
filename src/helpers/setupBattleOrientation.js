import { onDomReady } from "./domReady.js";

/**
 * Apply orientation metadata to the battle header and watch for orientation changes.
 *
 * @pseudocode
 * 1. Locate `.battle-header`; if missing, exit early.
 * 2. Define `getOrientation` that compares `innerHeight` and `innerWidth` and
 *    uses `(orientation: portrait)` media query when available.
 * 3. Define `apply` to update `header.dataset.orientation` when the value changes.
 * 4. Invoke `apply` once to set the initial orientation.
 * 5. Define `onChange` that throttles `apply` via `requestAnimationFrame`.
 * 6. Attach `resize` and `orientationchange` listeners that trigger `onChange`.
 */
export function setupBattleOrientation() {
  const header = document.querySelector(".battle-header");
  if (!header) return;

  const getOrientation = () => {
    try {
      const portrait = window.innerHeight >= window.innerWidth;
      if (typeof window.matchMedia === "function") {
        const mm = window.matchMedia("(orientation: portrait)");
        if (typeof mm.matches === "boolean" && mm.matches !== portrait) {
          return portrait ? "portrait" : "landscape";
        }
        return mm.matches ? "portrait" : "landscape";
      }
      return portrait ? "portrait" : "landscape";
    } catch {
      return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
    }
  };

  const apply = () => {
    const next = getOrientation();
    if (header.dataset.orientation !== next) {
      header.dataset.orientation = next;
    }
  };

  apply();

  let pending = false;
  const onChange = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      apply();
    });
  };

  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
}

onDomReady(setupBattleOrientation);
