import { loadNavigationItems } from "./gameModeUtils.js";

let navReadyResolve;
export const navReadyPromise =
  typeof window !== "undefined"
    ? new Promise((resolve) => {
        navReadyResolve = resolve;
      })
    : Promise.resolve();

if (typeof window !== "undefined") {
  window.navReadyPromise = navReadyPromise;
}

/**
 * Highlight the navigation link matching the current location.
 *
 * @pseudocode
 * 1. Guard: return if `document` or `window` is undefined.
 * 2. Select all `.bottom-navbar a` elements.
 * 3. Resolve each link's `href` with `new URL()`.
 * 4. Compare `URL.pathname` with `window.location.pathname`.
 * 5. Toggle the `active` class on match.
 */
export function highlightActiveLink() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const links = document.querySelectorAll(".bottom-navbar a");
  const current = window.location.pathname;
  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const resolved = new URL(href, window.location.href);
    link.classList.toggle("active", resolved.pathname === current);
  });
}

/**
 * Adds touch feedback animations to navigation links.
 *
 * @pseudocode
 * 1. Loop through all navigation links.
 * 2. Add a `mousedown` event listener to create a ripple effect.
 * 3. Remove the ripple effect after the animation completes.
 */
function addTouchFeedback() {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll(".bottom-navbar a");
  links.forEach((link) => {
    link.addEventListener("mousedown", (event) => {
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.clientX - link.offsetLeft}px`;
      ripple.style.top = `${event.clientY - link.offsetTop}px`;
      link.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 500);
    });
  });
}

/**
 * Apply navigation order and visibility to existing links.
 *
 * @pseudocode
 * 1. Guard: return if `document` is undefined.
 * 2. Select all `<a>` elements with `data-testid` beginning with "nav-".
 * 3. Load navigation items via `loadNavigationItems()` and filter for `category === "mainMenu"`.
 * 4. For each selected link:
 *    a. Extract the numeric ID from `data-testid`.
 *    b. Find the matching navigation item.
 *    c. If found, set `style.order` and toggle the `hidden` class based on `isHidden`.
 *    d. If not found, add the `hidden` class.
 * 5. Apply touch feedback to the links.
 * 6. On error, log the issue.
 *
 * @returns {Promise<void>} Resolves when the navbar has been updated.
 */
export async function populateNavbar() {
  if (typeof document === "undefined") return;
  const signalReady = () => {
    document.body?.setAttribute("data-nav-ready", "true");
    const evt = document.defaultView?.Event
      ? new document.defaultView.Event("nav:ready")
      : new Event("nav:ready");
    document.dispatchEvent(evt);
    navReadyResolve?.();
  };
  try {
    const links = document.querySelectorAll('a[data-testid^="nav-"]');
    if (links.length === 0) return;

    const items = await loadNavigationItems();
    const mainMenu = items.filter((item) => item.category === "mainMenu");

    links.forEach((link) => {
      const id = Number((link.getAttribute("data-testid") || "").replace("nav-", ""));
      const match = mainMenu.find((m) => Number(m.id) === id);
      if (match) {
        link.style.order = String(match.order);
        link.classList.toggle("hidden", match.isHidden);
      } else {
        link.classList.add("hidden");
      }
    });

    addTouchFeedback();
    highlightActiveLink();
  } catch (error) {
    console.error("Error applying navigation items:", error);
  } finally {
    signalReady();
  }
}
