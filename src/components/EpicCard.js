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
   * @pseudocode
   * 1. container ← await super.render()
   * 2. badge ← create <span> with class "epic-badge"
   * 3. set badge text to "EPIC"
   * 4. append badge to this.element
   * 5. return container
   *
   * Assumes `super.render` sets `this.element` to the card container and returns it.
   * Side effect: mutates `this.element` by adding the badge.
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
