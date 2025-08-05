import { loadMenuModes } from "./navigation/navData.js";
import { BASE_PATH, clearBottomNavbar, navTooltipKey } from "./navigation/navMenu.js";

/**
 * Adds touch feedback animations to navigation links.
 *
 * @pseudocode
 * 1. Loop through all navigation links.
 * 2. Add a `mousedown` event listener to create a ripple effect.
 * 3. Remove the ripple effect after the animation completes.
 */
function addTouchFeedback() {
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
 * Populates the bottom navigation bar with game modes from a JSON file.
 *
 * @pseudocode
 * 1. Guard: return immediately if `document` is undefined.
 * 2. Select the `.bottom-navbar` element and exit if not found.
 * 3. Clear existing content using `clearBottomNavbar()`.
 * 4. Call `loadMenuModes()` to retrieve active game modes.
 * 5. If none are returned, display "No game modes available".
 * 6. Map the modes to list items and mark the current page link as active.
 * 7. Append the list to the navigation bar and add touch feedback.
 * 8. On error, log the issue and show fallback items.
 *
 * @returns {Promise<void>} A promise that resolves once the navbar is populated.
 */

export async function populateNavbar() {
  if (typeof document === "undefined") return; // Guard for non-DOM environments
  try {
    const navBar = document.querySelector(".bottom-navbar");
    if (!navBar) return; // Guard: do nothing if navbar is missing
    clearBottomNavbar();

    const activeModes = await loadMenuModes();

    if (activeModes.length === 0) {
      navBar.innerHTML = "<ul><li>No game modes available</li></ul>";
      return;
    }

    const currentPath = window.location.pathname.replace(/^\//, "");
    const ul = document.createElement("ul");
    ul.innerHTML = activeModes
      .map((mode) => {
        const href = new URL(mode.url, BASE_PATH).href;
        const linkPath = new URL(href, window.location.href).pathname.replace(/^\//, "");
        const isCurrent = linkPath === currentPath || linkPath.endsWith(currentPath);
        const attrs = isCurrent ? ` class="active" aria-current="page"` : "";
        // Ensure Classic Battle always gets data-testid="nav-1"
        const testId = mode.name === "Classic Battle" || mode.id === 1 ? "nav-1" : `nav-${mode.id}`;
        return `<li><a href="${href}" data-testid="${testId}" data-tooltip-id="nav.${navTooltipKey(mode.name)}"${attrs}>${mode.name}</a></li>`;
      })
      .join("");
    navBar.appendChild(ul);

    addTouchFeedback();
  } catch (error) {
    console.error("Error loading game modes:", error);

    if (typeof document === "undefined") return; // Guard if DOM is gone
    const navBar = document.querySelector(".bottom-navbar");
    if (!navBar) return; // Guard: do nothing if navbar is missing
    clearBottomNavbar();

    const fallbackItems = [
      {
        name: "Random Judoka",
        url: `${BASE_PATH}randomJudoka.html`,
        image: "./src/assets/images/randomJudoka.png"
      },
      {
        name: "Home",
        url: new URL("../../index.html", BASE_PATH),
        image: "./src/assets/images/home.png"
      },
      {
        name: "Classic Battle",
        url: `${BASE_PATH}battleJudoka.html`,
        image: "./src/assets/images/classicBattle.png"
      }
    ];

    const currentPath = window.location.pathname.replace(/^\//, "");
    const ul = document.createElement("ul");
    ul.innerHTML = fallbackItems
      .map((item) => {
        const href = new URL(item.url, BASE_PATH).href;
        const linkPath = new URL(href, window.location.href).pathname.replace(/^\//, "");
        const isCurrent = linkPath === currentPath || linkPath.endsWith(currentPath);
        const attrs = isCurrent ? ` class="active" aria-current="page"` : "";
        // Ensure Classic Battle always gets data-testid="nav-1"
        const testId =
          item.name === "Classic Battle" ? "nav-1" : `nav-${item.name.replace(/\s+/g, "")}`;
        return `<li><a href="${href}" data-testid="${testId}" data-tooltip-id="nav.${navTooltipKey(item.name)}"${attrs}>${item.name}</a></li>`;
      })
      .join("");
    navBar.appendChild(ul);

    console.error("Fallback game modes loaded due to error.");
  }
}
