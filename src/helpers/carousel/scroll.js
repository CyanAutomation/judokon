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
 *    - Include a visible `<span class="label">` with "Prev." or "Next" text.
 *    - Add an accessible label (`aria-label`) matching the visible text.
 *
 * 3. Add a click event listener to the button:
 *    - Scroll the `container` by one page width plus gap in the given direction.
 *    - Use smooth scrolling for better user experience.
 *
 * 4. Return the created button element.
 *
 * @param {String} direction - Either "left" or "right".
 * @param {HTMLElement} container - The carousel container to scroll.
 * @returns {HTMLElement} The scroll button element.
 */
export function createScrollButton(direction, container) {
  if (direction !== "left" && direction !== "right") {
    throw new Error("Invalid direction: must be 'left' or 'right'");
  }

  if (!container) {
    throw new Error("Container is required");
  }

  const button = document.createElement("button");

  button.className = `scroll-button ${direction}`;

  const labelText = direction === "left" ? "Prev." : "Next";

  button.innerHTML =
    (direction === "left"
      ? '<svg xmlns="http://www.w3.org/2000/svg" height="36px" width="36px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" height="36px" width="36px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>') +
    `<span class="label">${labelText}</span>`;

  button.setAttribute("aria-label", labelText);

  button.addEventListener("click", () => {
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const scrollAmount = container.clientWidth + gap;
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
 * 1. Calculate the remaining distance using `scrollWidth`, `clientWidth`, and
 *    `scrollLeft` of `container`.
 * 2. Disable `leftBtn` when `scrollLeft` is within 1px of the carousel's
 *    start to account for rounding differences.
 * 3. Disable `rightBtn` when the remaining distance is within 1px of the
 *    carousel's end.
 *
 * @param {HTMLElement} container - The scrolling container element.
 * @param {HTMLButtonElement} leftBtn - Button that scrolls left.
 * @param {HTMLButtonElement} rightBtn - Button that scrolls right.
 */
/**
 * Update scroll button disabled states based on container position.
 *
 * Disables the left or right scroll buttons when the carousel is already at
 * the respective start or end. Uses a small EPSILON to tolerate rounding.
 *
 * @pseudocode
 * 1. Calculate the remaining distance using `scrollWidth`, `clientWidth`, and
 *    `scrollLeft` of `container`.
 * 2. Disable `leftBtn` when `scrollLeft` is within 1px of the carousel's
 *    start to account for rounding differences.
 * 3. Disable `rightBtn` when the remaining distance is within 1px of the
 *    carousel's end.
 *
 * @param {HTMLElement} container - The scrolling container element.
 * @param {HTMLButtonElement} leftBtn - Button that scrolls left.
 * @param {HTMLButtonElement} rightBtn - Button that scrolls right.
 * @returns {void}
 */
export function updateScrollButtonState(container, leftBtn, rightBtn) {
  const EPSILON = 1; // allow small rounding differences
  const remaining = container.scrollWidth - container.clientWidth - container.scrollLeft;
  leftBtn.disabled = container.scrollLeft <= EPSILON;
  rightBtn.disabled = remaining <= EPSILON;
}
