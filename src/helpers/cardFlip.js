/**
 * Enable click and keyboard flipping on a card element.
 *
 * @pseudocode
 * 1. Guard against a missing `cardElement`.
 * 2. Define `toggle` to flip the card's `show-card-back` class.
 * 3. Attach click and key handlers that invoke `toggle`.
 *
 * @param {HTMLElement} cardElement - Card container to enable flipping on.
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
export function enableCardFlip(cardElement) {
  if (!cardElement) return;
  const toggle = () => {
    cardElement.classList.toggle("show-card-back");
  };
  cardElement.addEventListener("click", toggle);
  cardElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}
