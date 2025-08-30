/**
 * Add focus, keyboard and hover handlers for carousel cards.
 *
 * @pseudocode
 * 1. Define an internal `updateCardFocusStyles` function:
 *    a. Get all `.judoka-card` elements within the `container`.
 *    b. For each card, remove the "focused-card" class and clear any `transform` style.
 *    c. Get the bounding rectangle of the `container`.
 *    d. Initialize `minDist` to `Infinity` and `centerCard` to `null`.
 *    e. Iterate through each `card`:
 *       i. Get the bounding rectangle of the `card`.
 *       ii. Calculate the `cardCenter` (horizontal midpoint of the card).
 *       iii. Calculate the `dist` (absolute distance from `cardCenter` to the `container`'s horizontal midpoint).
 *       iv. If `dist` is less than `minDist`, update `minDist` and set `centerCard` to the current `card`.
 *    f. If a `centerCard` is found, add the "focused-card" class to it and apply a `scale(1.1)` transform.
 * 2. Add a "keydown" event listener to the `container`:
 *    a. If the `document.activeElement` is the `container` itself, exit (meaning focus is on the carousel container, not a card).
 *    b. If the pressed key (`e.key`) is "ArrowRight" or "ArrowLeft":
 *       i. Get all `.judoka-card` elements.
 *       ii. Get the `current` active element.
 *       iii. Find the `idx` of the `current` card in the `cards` array. If not found, default to 0.
 *       iv. If "ArrowRight" is pressed and `idx` is not the last card, focus the next card (`cards[idx + 1]`).
 *       v. Else if "ArrowLeft" is pressed and `idx` is not the first card, focus the previous card (`cards[idx - 1]`).
 *       vi. Use `setTimeout(updateCardFocusStyles, 0)` to update styles after focus has shifted.
 * 3. Add "focusin" and "focusout" event listeners to the `container` that call `updateCardFocusStyles`.
 * 4. Add "mouseover" event listener to the `container`:
 *    a. If the `e.target` has the class "judoka-card", call `updateCardFocusStyles`.
 * 5. Add "mouseout" event listener to the `container`:
 *    a. If the `e.target` has the class "judoka-card", call `updateCardFocusStyles`.
 *
 * @param {HTMLElement} container - Carousel container element.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function setupFocusHandlers(container) {
  function updateCardFocusStyles() {
    const cards = Array.from(container.querySelectorAll(".judoka-card"));
    cards.forEach((card) => {
      card.classList.remove("focused-card");
      card.style.transform = "";
    });
    const containerRect = container.getBoundingClientRect();
    let minDist = Infinity;
    let centerCard = null;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cardCenter - (containerRect.left + containerRect.width / 2));
      if (dist < minDist) {
        minDist = dist;
        centerCard = card;
      }
    });
    if (centerCard) {
      centerCard.classList.add("focused-card");
      centerCard.style.transform = "scale(1.1)";
    }
  }

  container.addEventListener("keydown", (e) => {
    if (document.activeElement === container) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const cards = Array.from(container.querySelectorAll(".judoka-card"));
      const current = document.activeElement;
      let idx = cards.indexOf(current);
      if (idx === -1) idx = 0;
      if (e.key === "ArrowRight" && idx < cards.length - 1) {
        cards[idx + 1].focus();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        cards[idx - 1].focus();
      }
      setTimeout(updateCardFocusStyles, 0);
    }
  });
  container.addEventListener("focusin", updateCardFocusStyles);
  container.addEventListener("focusout", updateCardFocusStyles);

  container.addEventListener("mouseover", (e) => {
    if (e.target.classList.contains("judoka-card")) {
      updateCardFocusStyles();
    }
  });
  container.addEventListener("mouseout", (e) => {
    if (e.target.classList.contains("judoka-card")) {
      updateCardFocusStyles();
    }
  });
}
