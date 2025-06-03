import { createGokyoLookup } from "./utils.js";
import { generateJudokaCard } from "./cardBuilder.js";

/**
 * Creates a scroll button with the specified direction and functionality.
 *
 * @pseudocode
 * 1. Validate the input parameters:
 *    - Ensure `direction` is either "left" or "right".
 *    - Ensure `container` is a valid DOM element.
 *    - Throw an error if validation fails.
 *
 * 2. Create a button element:
 *    - Assign a class based on the `direction` (e.g., "scroll-button left" or "scroll-button right").
 *    - Set the inner HTML to display an arrow symbol ("<" for left, ">" for right).
 *    - Add an accessible label (`aria-label`) for screen readers (e.g., "Scroll Left").
 *
 * 3. Add a click event listener to the button:
 *    - Scroll the `container` by the specified `scrollAmount`.
 *    - Use smooth scrolling for better user experience.
 *
 * 4. Return the created button element.
 *
 * @param {String} direction - Either "left" or "right".
 * @param {HTMLElement} container - The carousel container to scroll.
 * @param {Number} scrollAmount - The amount to scroll in pixels.
 * @returns {HTMLElement} The scroll button element.
 */
export function createScrollButton(direction, container, scrollAmount) {
  if (direction !== "left" && direction !== "right") {
    throw new Error("Invalid direction: must be 'left' or 'right'");
  }

  if (!container) {
    throw new Error("Container is required");
  }

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

function validateJudokaList(judokaList) {
  if (!Array.isArray(judokaList) || judokaList.length === 0) {
    console.error("No judoka data available to build the carousel.");
    return false;
  }
  return true;
}

function validateGokyoData(gokyoData) {
  if (!Array.isArray(gokyoData) || gokyoData.length === 0) {
    console.warn("No gokyo data provided. Defaulting to an empty lookup.");
  }
  return createGokyoLookup(gokyoData);
}

function createLoadingSpinner(wrapper) {
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  wrapper.appendChild(spinner);

  const timeoutId = setTimeout(() => {
    spinner.style.display = "block";
  }, 2000);

  return { spinner, timeoutId };
}

function handleBrokenImages(card) {
  const img = card.querySelector("img");
  if (img) {
    img.onerror = () => {
      img.src = "path/to/default-image.png"; // Replace with actual path to fallback image
    };
  }
}

function setupKeyboardNavigation(container) {
  container.tabIndex = 0; // Make the carousel focusable
  container.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      container.scrollBy({ left: -300, behavior: "smooth" });
    } else if (event.key === "ArrowRight") {
      container.scrollBy({ left: 300, behavior: "smooth" });
    }
  });
}

function setupSwipeNavigation(container) {
  let touchStartX = 0;

  container.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  });

  container.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > 50) {
      container.scrollBy({ left: -300, behavior: "smooth" });
    } else if (swipeDistance < -50) {
      container.scrollBy({ left: 300, behavior: "smooth" });
    }
  });
}

/**
 * Builds a carousel of judoka cards with scroll buttons.
 *
 * @pseudocode
 * 1. Validate the input parameters:
 *    - Ensure `judokaList` is a non-empty array.
 *    - Ensure `gokyoData` is an array (default to an empty lookup if missing).
 *    - Log warnings or errors for invalid inputs.
 *
 * 2. Create the carousel container:
 *    - Create a `<div>` element with the class `card-carousel`.
 *
 * 3. Create a wrapper element for the carousel:
 *    - Create a `<div>` element with the class `carousel-container`.
 *    - Add a loading spinner to indicate progress.
 *
 * 4. Transform `gokyoData` into a lookup object for quick access.
 *
 * 5. Loop through the `judokaList` array:
 *    - Validate each judoka object (ensure required fields are present).
 *    - Generate a card using `generateJudokaCard`.
 *    - Handle broken card images by setting a fallback image.
 *    - Append the generated card to the carousel container.
 *
 * 6. Remove the loading spinner once all cards are processed.
 *
 * 7. Create and append scroll buttons:
 *    - Create a left scroll button to scroll the carousel left.
 *    - Create a right scroll button to scroll the carousel right.
 *    - Append both buttons to the wrapper.
 *
 * 8. Add keyboard navigation:
 *    - Enable scrolling with the left and right arrow keys.
 *
 * 9. Add swipe functionality for touch devices:
 *    - Detect swipe gestures to scroll the carousel left or right.
 *
 * 10. Return the completed wrapper element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  if (!validateJudokaList(judokaList)) {
    return document.createElement("div");
  }

  const gokyoLookup = validateGokyoData(gokyoData);

  const container = document.createElement("div");
  container.className = "card-carousel";

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";

  const { spinner, timeoutId } = createLoadingSpinner(wrapper);

  for (const judoka of judokaList) {
    if (
      !judoka.firstname ||
      !judoka.surname ||
      !judoka.country ||
      !judoka.stats ||
      !judoka.signatureMoveId
    ) {
      console.error("Invalid judoka object:", judoka);
      continue;
    }

    const card = await generateJudokaCard(judoka, gokyoLookup, container);
    handleBrokenImages(card);
  }

  clearTimeout(timeoutId);
  spinner.style.display = "none";

  const leftButton = createScrollButton("left", container, 300);
  const rightButton = createScrollButton("right", container, 300);

  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  setupKeyboardNavigation(container);
  setupSwipeNavigation(container);

  return wrapper;
}
