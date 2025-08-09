/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `loadMenuModes` from `navigation/navData.js`.
 * 2. Import `buildMenu` and `setupHamburger` from `api/navigation.js`.
 * 3. Import `populateNavbar` from `navigationBar.js`.
 * 4. Import `setupButtonEffects` from `buttonEffects.js`.
 * 5. Import `onDomReady`.
 * 6. Define async `configureBottomNavbar` to load active modes and apply both navigation layouts via `buildMenu`.
 * 7. Define async `init` to call `setupButtonEffects`, `setupHamburger`, await `populateNavbar`, and `configureBottomNavbar`.
 * 8. Use `onDomReady` to invoke `init` with guarded error handling.
 */
import { loadMenuModes } from "./navigation/navData.js";
import { buildMenu, setupHamburger } from "./api/navigation.js";
import { populateNavbar } from "./navigationBar.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";

async function configureBottomNavbar() {
  try {
    const modes = await loadMenuModes();
    buildMenu(modes, { orientation: "landscape" });
    buildMenu(modes, { orientation: "portrait" });
  } catch {
    // Ignore configuration errors
  }
}

async function init() {
  setupButtonEffects();
  setupHamburger();
  await populateNavbar();
  configureBottomNavbar();
}

onDomReady(() => init().catch(() => {}));
