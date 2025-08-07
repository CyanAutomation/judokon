/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `loadMenuModes` from `navigation/navData.js`.
 * 2. Import `toggleExpandedMapView`, `togglePortraitTextMenu`, and `setupHamburgerMenu` from `navigation/navMenu.js`.
 * 3. Import `setupButtonEffects` from `buttonEffects.js`.
 * 4. Import `onDomReady`.
 * 5. Define async `configureBottomNavbar` to load active modes and apply both navigation layouts.
 * 6. Define async `init` to call `setupButtonEffects`, `configureBottomNavbar`, and `setupHamburgerMenu`.
 * 7. Use `onDomReady` to invoke `init` with guarded error handling.
 */
import { loadMenuModes } from "./navigation/navData.js";
import {
  toggleExpandedMapView,
  togglePortraitTextMenu,
  setupHamburgerMenu
} from "./navigation/navMenu.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";

async function configureBottomNavbar() {
  try {
    const modes = await loadMenuModes();
    toggleExpandedMapView(modes);
    togglePortraitTextMenu(modes);
  } catch {
    // Ignore configuration errors
  }
}

async function init() {
  setupButtonEffects();
  await configureBottomNavbar();
  setupHamburgerMenu();
}

onDomReady(() => init().catch(() => {}));
