/**
 * Populates the bottom navigation bar with game modes from a JSON file.
 *
 * Pseudocode:
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
    .then((response) => response.json())
    .then((data) => {
      const navBar = document.querySelector(".bottom-navbar ul");
      const activeModes = data
        .filter((mode) => mode.category === "mainMenu" && !mode.isHidden)
        .sort((a, b) => a.order - b.order);

      if (activeModes.length === 0) {
        navBar.innerHTML = "<li>No game modes available</li>";
        return;
      }

      navBar.innerHTML = activeModes
        .map((mode) => `<li><a href="pages/${mode.url}">${mode.name}</a></li>`)
        .join("");
    })
    .catch(() => {
      const navBar = document.querySelector(".bottom-navbar ul");
      const fallbackItems = [
        { name: "Random Judoka", url: "/pages/randomJudoka.html" },
        { name: "Home", url: "/index.html" },
        { name: "Classic Battle", url: "/pages/battleJudoka.html" }
      ];

      navBar.innerHTML = fallbackItems
        .map((item) => `<li><a href="${item.url}">${item.name}</a></li>`)
        .join("");

      console.error("Failed to load game modes");
    });
}
