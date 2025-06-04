import { debugLog } from "./debug.js";

/**
 * Toggles the expanded map view for landscape mode.
 *
 * @pseudocode
 * 1. Check if the device is in landscape orientation.
 * 2. Create a map view with clickable tiles for game modes.
 * 3. Add a slide-up animation when the logo is clicked.
 * 4. Hide the map view when the logo is clicked again.
 *
 * @param {Array} gameModes - The list of game modes to display.
 */
function toggleExpandedMapView(gameModes) {
  const navBar = document.querySelector(".bottom-navbar");
  clearBottomNavbar(); // Clear existing content

  const validModes = validateGameModes(gameModes);

  const mapView = document.createElement("div");
  mapView.className = "expanded-map-view";

  mapView.innerHTML = validModes
    .map(
      (mode) =>
        `<div class="map-tile" style="background-image: url('${mode.image}')">
          <a href="pages/${mode.url}" aria-label="${mode.name}">${mode.name}</a>
        </div>`
    )
    .join("");

  navBar.appendChild(mapView);

  const logo = document.querySelector(".bottom-navbar .logo");
  logo.addEventListener("click", () => {
    mapView.classList.toggle("visible");
    mapView.style.animation = mapView.classList.contains("visible")
      ? "slide-up 500ms ease-in-out"
      : "slide-down 500ms ease-in-out";
  });
}

/**
 * Clears existing content in the bottom navigation bar.
 *
 * @pseudocode
 * 1. Select the `.bottom-navbar` element.
 * 2. Remove all child elements to prevent duplication.
 */
function clearBottomNavbar() {
  const navBar = document.querySelector(".bottom-navbar");
  navBar.innerHTML = ""; // Clear all existing content
}

/**
 * Toggles the vertical text menu for portrait mode.
 *
 * @pseudocode
 * 1. Check if the device is in portrait orientation.
 * 2. Create a vertical menu with game modes as list items.
 * 3. Add a slide-down animation when the logo is clicked.
 * 4. Hide the menu when the logo is clicked again.
 *
 * @param {Array} gameModes - The list of game modes to display.
 */
function togglePortraitTextMenu(gameModes) {
  const navBar = document.querySelector(".bottom-navbar");
  clearBottomNavbar(); // Clear existing content

  const validModes = validateGameModes(gameModes);

  const textMenu = document.createElement("ul");
  textMenu.className = "portrait-text-menu";

  textMenu.innerHTML = validModes
    .map(
      (mode) => `<li><a href="pages/${mode.url}" aria-label="${mode.name}">${mode.name}</a></li>`
    )
    .join("");

  navBar.appendChild(textMenu);

  const logo = document.querySelector(".bottom-navbar .logo");
  logo.addEventListener("click", () => {
    textMenu.classList.toggle("visible");
    textMenu.style.animation = textMenu.classList.contains("visible")
      ? "slide-down 500ms ease-in-out"
      : "slide-up 500ms ease-in-out";
  });
}

/**
 * Validates game modes data to ensure all required properties are present.
 *
 * @pseudocode
 * 1. Filter out items missing `name`, or `url` properties.
 * 2. Return the filtered array.
 *
 * @param {Array} gameModes - The list of game modes to validate.
 * @returns {Array} Validated game modes.
 */
function validateGameModes(gameModes) {
  const validatedModes = gameModes.filter((mode) => mode.name && mode.url);
  debugLog("Validated modes:", validatedModes); // Debug validated modes
  return validatedModes;
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
 * 1. Fetch the JSON file containing game modes (`gameModes.json`).
 *    - If the fetch fails, log an error and display fallback items in the navigation bar.
 *
 * 2. Parse the JSON response to retrieve the game modes data.
 *    - Handle parsing errors gracefully.
 *
 * 3. Filter the game modes:
 *    - Include only modes where `category` is "mainMenu" and `isHidden` is `false`.
 *
 * 4. Sort the filtered game modes by their `order` property in ascending order.
 *
 * 5. Check if there are any active modes:
 *    - If no modes are available, display "No game modes available" in the navigation bar.
 *
 * 6. Map the sorted game modes to HTML list items (`<li>`):
 *    - Each list item contains a link (`<a>`) to the corresponding game mode's URL.
 *
 * 7. Update the navigation bar (`.bottom-navbar ul`) with the generated HTML.
 *
 * 8. Handle any errors during the process:
 *    - Log the error to the console and display fallback items in the navigation bar.
 *
 * @returns {void}
 */
export function populateNavbar() {
  fetch("./data/gameModes.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch game modes: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      debugLog("Fetched game modes:", data); // Debug fetched data

      const navBar = document.querySelector(".bottom-navbar");
      clearBottomNavbar(); // Clear existing content

      // Filter game modes to include only visible main menu items
      const activeModes = validateGameModes(
        data.filter((mode) => mode.category === "mainMenu" && mode.isHidden === false)
      ).sort((a, b) => a.order - b.order);

      debugLog("Validated game modes:", activeModes); // Debug validated data

      if (activeModes.length === 0) {
        navBar.innerHTML = "<ul><li>No game modes available</li></ul>";
        return;
      }

      const ul = document.createElement("ul");
      ul.innerHTML = activeModes
        .map((mode) => `<li><a href="pages/${mode.url}">${mode.name}</a></li>`)
        .join("");
      navBar.appendChild(ul);

      addTouchFeedback();
      // toggleExpandedMapView(activeModes);
      // togglePortraitTextMenu(activeModes);
    })
    .catch((error) => {
      console.error("Error loading game modes:", error);

      const navBar = document.querySelector(".bottom-navbar");
      clearBottomNavbar(); // Clear existing content

      const fallbackItems = [
        {
          name: "Random Judoka",
          url: "/pages/randomJudoka.html",
          image: "./assets/images/randomJudoka.png"
        },
        { name: "Home", url: "/index.html", image: "./assets/images/home.png" },
        {
          name: "Classic Battle",
          url: "/pages/battleJudoka.html",
          image: "./assets/images/classicBattle.png"
        }
      ];

      const ul = document.createElement("ul");
      ul.innerHTML = fallbackItems
        .map((item) => `<li><a href="${item.url}">${item.name}</a></li>`)
        .join("");
      navBar.appendChild(ul);

      console.error("Fallback game modes loaded due to error.");
    });
}
