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
 * Highlights the navigation link in the bottom navigation bar that corresponds
 * to the current page's URL.
 *
 * @summary This function ensures that the user's current location within the
 * application is visually indicated in the navigation menu.
 *
 * @pseudocode
 * 1. Check if `document` or `window` is undefined (e.g., in a non-browser environment). If so, exit early.
 * 2. Select all `<a>` (anchor) elements within the `.bottom-navbar` container.
 * 3. Get the current page's pathname from `window.location.pathname`.
 * 4. Iterate over each navigation `link` found:
 *    a. Get the `href` attribute of the `link`.
 *    b. Resolve the `href` into a full URL using `new URL(href, window.location.href)` to handle relative paths correctly.
 *    c. Compare the `pathname` of the resolved link's URL with the `current` page's pathname.
 *    d. Toggle the `active` CSS class on the `link` element: add `active` if the pathnames match, remove it otherwise.
 *
 * @returns {void}
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
