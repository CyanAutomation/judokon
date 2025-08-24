/**
 * Compute carousel paging metrics based on current layout.
 *
 * @pseudocode
 * 1. Get the computed styles of the `container` element.
 * 2. Extract the `gap` value from the computed styles, preferring `columnGap` and falling back to `gap`, defaulting to 0 if neither is found.
 * 3. Query all elements with the class ".judoka-card" within the `container`.
 * 4. Get the `firstCard` from the queried list.
 * 5. Determine `cardWidth`: If `firstCard` exists, use its `offsetWidth`; otherwise, set to 0.
 * 6. Get the `containerWidth` from `container.clientWidth`.
 * 7. Calculate `cardsPerPage`:
 *    a. If `cardWidth` is greater than 0:
 *       i. Calculate the number of cards that can fit by dividing the `containerWidth` plus `gap` by `cardWidth` plus `gap`.
 *       ii. Use `Math.floor` to get a whole number of cards.
 *       iii. Ensure at least 1 card per page using `Math.max(1, ...)`.
 *    b. Otherwise (if `cardWidth` is 0), default `cardsPerPage` to 1.
 * 8. Calculate `pageCount`: Determine the total number of pages by dividing the total number of `cards` by `cardsPerPage`, using `Math.ceil` to round up, and ensuring at least 1 page using `Math.max(1, ...)`.
 * 9. Calculate `pageWidth`:
 *    a. If `cardWidth` is greater than 0, calculate `pageWidth` as `cardsPerPage` multiplied by (`cardWidth` plus `gap`).
 *    b. Otherwise, default `pageWidth` to `containerWidth` plus `gap`.
 * 10. Return an object containing `gap`, `pageWidth`, `cardsPerPage`, and `pageCount`.
 *
 * @param {HTMLElement} container
 * @returns {{gap:number,pageWidth:number,cardsPerPage:number,pageCount:number}}
 */
export function getPageMetrics(container) {
  const styles = getComputedStyle(container);
  const gap = parseFloat(styles.columnGap || styles.gap) || 0;

  const cards = container.querySelectorAll(".judoka-card");
  const firstCard = cards[0];
  const cardWidth = firstCard ? firstCard.offsetWidth : 0;
  const containerWidth = container.clientWidth;

  const cardsPerPage = cardWidth
    ? Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
    : 1;

  const pageCount = Math.max(1, Math.ceil(cards.length / cardsPerPage));
  const pageWidth = cardWidth ? cardsPerPage * (cardWidth + gap) : containerWidth + gap;

  return { gap, pageWidth, cardsPerPage, pageCount };
}
