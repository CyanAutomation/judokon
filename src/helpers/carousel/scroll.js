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
 *    - Set the inner HTML to display an inline SVG chevron pointing left or right.
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
 *
 * Note: The function assumes `scrollAmount` is a number and does not
 * perform validation. Invalid values will simply be passed to
 * `scrollBy` without throwing an error.
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

  button.innerHTML =
    direction === "left"
      ? '<svg xmlns="http://www.w3.org/2000/svg" height="24px" width="24px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" height="24px" width="24px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>';

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
 * Update scroll button disabled states based on container position.
 *
 * @pseudocode
 * 1. Calculate the maximum scroll value using `scrollWidth` and
 *    `clientWidth` of `container`.
 * 2. Disable `leftBtn` when `scrollLeft` is at or before the first card.
 * 3. Disable `rightBtn` when `scrollLeft` reaches the end of the carousel.
 *
 * @param {HTMLElement} container - The scrolling container element.
 * @param {HTMLButtonElement} leftBtn - Button that scrolls left.
 * @param {HTMLButtonElement} rightBtn - Button that scrolls right.
 */
export function updateScrollButtonState(container, leftBtn, rightBtn) {
  const maxLeft = container.scrollWidth - container.clientWidth;
  leftBtn.disabled = container.scrollLeft <= 0;
  rightBtn.disabled = container.scrollLeft >= maxLeft;
}
