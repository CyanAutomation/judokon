/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `navigationBar.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. Import `onDomReady`.
 * 4. Define `renderBottomNavbar` as a fallback renderer.
 * 5. Define `ensureUniqueNavTestIds` to remove duplicate nav links.
 * 6. Define async `init` to call `setupButtonEffects`, await `populateNavbar`, and handle errors with `renderBottomNavbar`.
 * 7. After navigation is populated, call `ensureUniqueNavTestIds`.
 * 8. Use `onDomReady` to invoke `init` with guarded error handling.
 */
import { populateNavbar } from "./navigationBar.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";

/**
 * Render a minimal bottom navbar when dynamic population fails.
 *
 * @pseudocode
 * 1. Select the element with `data-testid="bottom-nav"`.
 * 2. Guard: return if the element is not found.
 * 3. Replace its contents with links for Random Judoka (nav-12) and Classic Battle (nav-1).
 */
function renderBottomNavbar() {
  const bottomNav = document.querySelector('[data-testid="bottom-nav"]');
  if (!bottomNav) return;
  bottomNav.innerHTML = `
    <a href="randomJudoka.html" data-testid="nav-12">Random Judoka</a>
    <a href="battleJudoka.html" data-testid="nav-1">Classic Battle</a>
  `;
}

/**
 * Remove duplicate navigation links for key test IDs.
 *
 * @pseudocode
 * 1. Guard: return if `document` is undefined.
 * 2. For each of `nav-1` and `nav-12`:
 *    a. Query all matching elements.
 *    b. Remove any element beyond the first.
 */
function ensureUniqueNavTestIds() {
  if (typeof document === "undefined") return;
  ["nav-1", "nav-12"].forEach((id) => {
    const elements = document.querySelectorAll(`[data-testid="${id}"]`);
    elements.forEach((el, index) => {
      if (index > 0) el.remove();
    });
  });
}

async function init() {
  setupButtonEffects();
  try {
    await populateNavbar();
  } catch {
    renderBottomNavbar();
  }
  ensureUniqueNavTestIds();
}

onDomReady(() => init().catch(() => {}));
