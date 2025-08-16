/**
 * Compute carousel paging metrics based on current layout.
 *
 * @pseudocode
 * 1. Read gap from computed styles (prefer columnGap, fallback to gap).
 * 2. Measure first card width to estimate cards per page; ensure at least 1.
 * 3. Compute pageCount and derive pageWidth from card widths when available,
 *    otherwise fallback to container width plus gap.
 * 4. Return { gap, pageWidth, cardsPerPage, pageCount }.
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
