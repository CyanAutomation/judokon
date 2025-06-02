import { createGokyoLookup } from "./utils.js";
import { generateJudokaCard } from "./cardBuilder.js";

/**
 * Creates a scroll button with the specified direction and functionality.
 *
 * Pseudocode:
 * 1. Create a button element.
 * 2. Assign a class to the button based on the direction (e.g., "scroll-button left" or "scroll-button right").
 * 3. Set the button's inner HTML to display an arrow symbol:
 *    - Use "<" for left and ">" for right.
 * 4. Add an accessible label (`aria-label`) to the button for screen readers:
 *    - Example: "Scroll Left" or "Scroll Right".
 * 5. Add a click event listener to the button:
 *    - When clicked, scroll the container by the specified amount.
 *    - Scroll left if the direction is "left", otherwise scroll right.
 *    - Use smooth scrolling for a better user experience.
 * 6. Return the created button element.
 *
 * @param {String} direction - Either "left" or "right".
 * @param {HTMLElement} container - The carousel container to scroll.
 * @param {Number} scrollAmount - The amount to scroll in pixels.
 * @returns {HTMLElement} The scroll button element.
 */
export ///**
 * Description.
 * @param {any} direction
 * @param {any} container
 * @param {any} scrollAmount
 * @returns {any}
 */
function createScrollButton(direction, container, scrollAmount) {
  if (direction !== "left" && direction !== "right") {
    throw new Error("Invalid direction: must be 'left' or 'right'");
  }
  if (!container) {
    throw new Error("Container is required");
  }
  const button = document.createElement("button");
  button.className = `scroll-button ${direction}`;
  button.innerHTML = direction === "left" ? "&lt;" : "&gt;";
  button.setAttribute("aria-label", `Scroll ${direction.charAt(0).toUpperCase() + direction.slice(1)}`);
  button.addEventListener("click", () => {
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  });
  return button;
}

/**
 * Builds a carousel of judoka cards with scroll buttons.
 *
 * Pseudocode:
 * 1. Create a container element for the carousel and assign it a class name.
 * 2. Transform the `gokyoData` array into a lookup object for quick access.
 * 3. Loop through the `judokaList` array:
 *    - For each judoka, generate a card using the `generateJudokaCard` function.
 *    - Append the generated card to the carousel container.
 * 4. Create a wrapper element for the carousel and assign it a class name.
 * 5. Create scroll buttons for navigating the carousel:
 *    - A left scroll button to scroll the carousel to the left.
 *    - A right scroll button to scroll the carousel to the right.
 * 6. Append the scroll buttons and the carousel container to the wrapper.
 * 7. Return the completed wrapper element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
/**
 * Builds a carousel of judoka cards with scroll buttons.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export ///**
 * Description.
 * @param {any} judokaList
 * @param {any} gokyoData
 * @returns {any}
 */
async function buildCardCarousel(judokaList, gokyoData) {
  if (!Array.isArray(judokaList) || judokaList.length === 0) {
    console.error("No judoka data available to build the carousel.");
    return document.createElement("div");
  }
  if (!Array.isArray(gokyoData) || gokyoData.length === 0) {
    console.warn("No gokyo data provided. Defaulting to an empty lookup.");
  }
  const container = document.createElement("div");
  container.className = "card-carousel";
  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";

  // Add loading spinner
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  wrapper.appendChild(spinner);
  const timeoutId = setTimeout(() => {
    spinner.style.display = "block";
  }, 2000);
  const gokyoLookup = createGokyoLookup(gokyoData);
  for (const judoka of judokaList) {
    if (!judoka.firstname || !judoka.surname || !judoka.country || !judoka.stats || !judoka.signatureMoveId) {
      console.error("Invalid judoka object:", judoka);
      continue;
    }
    const card = await generateJudokaCard(judoka, gokyoLookup, container);

    // Handle broken card images
    const img = card.querySelector("img");
    if (img) {
      img.onerror = () => {
        img.src = "path/to/default-image.png"; // Replace with actual path to fallback image
      };
    }
  }
  clearTimeout(timeoutId);
  spinner.style.display = "none";
  const leftButton = createScrollButton("left", container, 300);
  const rightButton = createScrollButton("right", container, 300);
  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);
  container.tabIndex = 0; // Make the carousel focusable

  container.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") {
      container.scrollBy({
        left: -300,
        behavior: "smooth"
      });
    } else if (event.key === "ArrowRight") {
      container.scrollBy({
        left: 300,
        behavior: "smooth"
      });
    }
  });
  container.addEventListener("touchstart", handleSwipeStart);
  container.addEventListener("touchend", handleSwipeEnd);
  let touchStartX = 0;
  ///**
 * Description.
 * @param {any} event
 * @returns {any}
 */
  function handleSwipeStart(event) {
    touchStartX = event.touches[0].clientX;
  }
  ///**
 * Description.
 * @param {any} event
 * @returns {any}
 */
  function handleSwipeEnd(event) {
    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;
    if (swipeDistance > 50) {
      container.scrollBy({
        left: -300,
        behavior: "smooth"
      });
    } else if (swipeDistance < -50) {
      container.scrollBy({
        left: 300,
        behavior: "smooth"
      });
    }
  }
  return wrapper;
}