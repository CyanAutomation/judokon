/**
 * Setup responsive card sizing and scroll snap behavior.
 *
 * @pseudocode
 * 1. Define a function to calculate card width based on window width.
 * 2. Apply the calculated width and scroll snap alignment to each card.
 * 3. Attach a ResizeObserver and window resize listener to update widths.
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
