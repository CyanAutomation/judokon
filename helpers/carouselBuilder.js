import { generateJudokaCardHTML } from "./cardBuilder.js";

/**
 * Transforms gokyoData into a lookup object for quick access.
 * @param {Array} gokyoData - Array of gokyo objects.
 * @returns {Object} A lookup object with gokyo IDs as keys.
 */
function createGokyoLookup(gokyoData) {
  if (!gokyoData || gokyoData.length === 0) {
    console.error("gokyoData is empty or undefined");
    return {};
  }

  return gokyoData.reduce((acc, move) => {
    acc[move.id] = move; // Use string keys for consistency
    return acc;
  }, {});
}

/**
 * Generates a single judoka card and appends it to the container.
 * @param {Object} judoka - A judoka object.
 * @param {Object} gokyoLookup - A lookup object for gokyo data.
 * @param {HTMLElement} container - The container to append the card to.
 */
async function generateJudokaCard(judoka, gokyoLookup, container) {
  try {
    const card = await generateJudokaCardHTML(judoka, gokyoLookup);
    container.appendChild(card);
  } catch (error) {
    console.error(`Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`, error);
  }
}

/**
 * Creates a scroll button with the specified direction and functionality.
 * @param {String} direction - Either "left" or "right".
 * @param {HTMLElement} container - The carousel container to scroll.
 * @param {Number} scrollAmount - The amount to scroll in pixels.
 * @returns {HTMLElement} The scroll button element.
 */
function createScrollButton(direction, container, scrollAmount) {
  const button = document.createElement("button");
  button.className = `scroll-button ${direction}`;
  button.innerHTML = direction === "left" ? "&lt;" : "&gt;";
  button.setAttribute(
    "aria-label",
    `Scroll ${direction.charAt(0).toUpperCase() + direction.slice(1)}`
  );

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
 * @param {Array} judokaList - An array of judoka objects.
 * @param {Array} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  // Create a new container for the carousel
  const container = document.createElement("div");
  container.className = "card-carousel";

  // Transform gokyoData into a lookup object
  const gokyoLookup = createGokyoLookup(gokyoData);

  // Generate cards for each judoka
  for (const judoka of judokaList) {
    await generateJudokaCard(judoka, gokyoLookup, container);
  }

  // Create a wrapper for the carousel and buttons
  const wrapper = document.createElement("div");
  wrapper.className = "carousel-wrapper";

  // Create scroll buttons
  const leftButton = createScrollButton("left", container, 300);
  const rightButton = createScrollButton("right", container, 300);

  // Append buttons and carousel to the wrapper
  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  // Return the completed wrapper
  return wrapper;
}
