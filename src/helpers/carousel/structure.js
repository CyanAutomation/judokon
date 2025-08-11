/**
 * Create base DOM elements for a card carousel.
 *
 * @pseudocode
 * 1. Create a wrapper `<div>` with class `carousel-container`.
 * 2. Create an `aria-live` region and append it to the wrapper.
 * 3. Create the scrolling container with required roles and styles.
 * 4. Return the `wrapper`, `container` and `ariaLive` elements.
 *
 * @returns {{wrapper: HTMLElement, container: HTMLElement, ariaLive: HTMLElement}}
 */
export function createCarouselStructure() {
  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";

  const ariaLive = document.createElement("div");
  ariaLive.setAttribute("aria-live", "polite");
  ariaLive.className = "carousel-aria-live";
  wrapper.appendChild(ariaLive);

  const container = document.createElement("div");
  container.className = "card-carousel";
  container.dataset.testid = "carousel";
  container.setAttribute("role", "list");
  container.setAttribute("aria-label", "Judoka card carousel");
  container.style.scrollSnapType = "x mandatory";
  container.style.overflowX = "auto";
  container.style.display = "flex";
  container.style.gap = "var(--carousel-gap, 1rem)";

  return { wrapper, container, ariaLive };
}
