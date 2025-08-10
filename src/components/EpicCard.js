import { JudokaCard } from "./JudokaCard.js";

/**
 * Epic judoka card with a special badge.
 *
 * @extends JudokaCard
 */
export class EpicCard extends JudokaCard {
  /**
   * Render the card with an added epic badge.
   *
   * @returns {Promise<HTMLElement>} Resolves with the card container element.
   */
  async render() {
    const container = await super.render();
    const badge = document.createElement("span");
    badge.className = "epic-badge";
    badge.textContent = "EPIC";
    this.element.appendChild(badge);
    return container;
  }
}

export default EpicCard;
