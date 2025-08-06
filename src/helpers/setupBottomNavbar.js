/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `navigationBar.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. Import `onDomReady`.
 * 4. Define `renderBottomNavbar` as a fallback renderer.
 * 5. Define `ensureUniqueNavTestIds` to remove duplicate nav links.
 * 6. Define async `init` to await `populateNavbar` and handle errors with `renderBottomNavbar`.
 * 7. After navigation is populated, call `ensureUniqueNavTestIds` and `setupButtonEffects`.
 * 8. Use `onDomReady` to invoke `init` when the DOM is ready.
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
 * 1. For each of `nav-1` and `nav-12`:
 *    a. Query all matching elements.
 *    b. Remove any element beyond the first.
 */
function ensureUniqueNavTestIds() {
  ["nav-1", "nav-12"].forEach((id) => {
    const elements = document.querySelectorAll(`[data-testid="${id}"]`);
    elements.forEach((el, index) => {
      if (index > 0) el.remove();
    });
  });
}

async function init() {
  try {
    await populateNavbar();
  } catch {
    renderBottomNavbar();
  }
  ensureUniqueNavTestIds();
  setupButtonEffects();
}

onDomReady(init);
