/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `navigationBar.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. Define `init` to call `populateNavbar` and `setupButtonEffects`.
 * 4. Use `onDomReady` to invoke `init` when the DOM is ready.
 */
import { populateNavbar } from "./navigationBar.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";

function init() {
  populateNavbar();
  setupButtonEffects();
}

onDomReady(init);

/**
 * @pseudocode
 * 1. Always include navigation links for nav-12 (Random Judoka) and nav-1 (Classic Battle) on all pages, including updateJudoka.html
 * 2. Ensure each link has the correct data-testid attribute
 * 3. Render these links in the bottom navbar
 */
function renderBottomNavbar() {
  const bottomNav = document.querySelector('[data-testid="bottom-nav"]');
  if (!bottomNav) return;
  bottomNav.innerHTML = `
    <a href="randomJudoka.html" data-testid="nav-12">Random Judoka</a>
    <a href="battleJudoka.html" data-testid="nav-1">Classic Battle</a>
    <!-- Add other nav links as needed -->
  `;
}

renderBottomNavbar();
