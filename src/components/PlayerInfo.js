/**
 * Define the `<player-info>` custom element for displaying player details.
 *
 * @pseudocode
 * 1. Create a class extending `HTMLElement`.
 * 2. In `connectedCallback`, set default text to "Player" if none provided.
 * 3. Register the element as `player-info`.
 */
export class PlayerInfo extends HTMLElement {
  connectedCallback() {
    if (!this.textContent.trim()) {
      this.textContent = "Player";
    }
  }
}

customElements.define("player-info", PlayerInfo);
