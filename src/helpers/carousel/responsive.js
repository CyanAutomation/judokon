/**
 * Setup responsive card sizing and scroll snap behavior.
 *
 * @pseudocode
 * 1. Define an internal `setCardWidths` function:
 *    a. Get the current `window.innerWidth`.
 *    b. Initialize `cardsInView` to a default of 3.
 *    c. Conditionally adjust `cardsInView` based on `window.innerWidth` breakpoints:
 *       i. Less than 600px: 1.5 cards.
 *       ii. Less than 900px: 2.5 cards.
 *       iii. Less than 1200px: 3.5 cards.
 *       iv. Otherwise: 5 cards.
 *    d. Calculate `cardWidth` as a CSS `clamp()` function string, ensuring it's between 200px and 260px, and responsive to `cardsInView` as a `vw` unit.
 *    e. Query all `.judoka-card` elements within the `container`.
 *    f. For each `card`:
 *       i. Set the CSS custom property `--card-width` to the calculated `cardWidth`.
 *       ii. Set `scrollSnapAlign` to "center".
 * 2. Create a `ResizeObserver` instance that calls `setCardWidths` whenever the `container` element's size changes.
 * 3. Start observing the `container` with the `resizeObs`.
 * 4. Add a "resize" event listener to the `window` that calls `setCardWidths` (for initial setup and window resizes).
 * 5. Immediately call `setCardWidths()` for initial setup.
 *
 * @param {HTMLElement} container - Carousel container with judoka cards.
 */
export function setupResponsiveSizing(container) {
  function setCardWidths() {
    const width = window.innerWidth;
    let cardsInView = 3;
    if (width < 600) cardsInView = 1.5;
    else if (width < 900) cardsInView = 2.5;
    else if (width < 1200) cardsInView = 3.5;
    else cardsInView = 5;
    const cardWidth = `clamp(200px, ${Math.floor(100 / cardsInView)}vw, 260px)`;
    container.querySelectorAll(".judoka-card").forEach((card) => {
      card.style.setProperty("--card-width", cardWidth);
      card.style.scrollSnapAlign = "center";
    });
  }

  const resizeObs = new ResizeObserver(setCardWidths);
  resizeObs.observe(container);
  window.addEventListener("resize", setCardWidths);
  setCardWidths();
}
