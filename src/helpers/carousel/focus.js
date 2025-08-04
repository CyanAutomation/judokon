/**
 * Add focus, keyboard and hover handlers for carousel cards.
 *
 * @pseudocode
 * 1. Highlight the card nearest the carousel center when focus changes
 *    while keeping focus on the container for keyboard navigation.
 * 2. Move focus with arrow keys only when a card already has focus and keep
 *    the center card enlarged.
 * 3. Update focus styles on mouse hover for desktop users.
 *
 * @param {HTMLElement} container - Carousel container element.
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
