/**
 * Define the `<player-info>` custom element for displaying player details.
 *
 * @pseudocode
 * 1. Create a class extending `HTMLElement` with a constructor that sets
 *    default text content.
 * 2. On connection or when the `name` attribute changes, update the displayed
 *    text using that attribute or the default.
 * 3. Register the element as `player-info`.
 */
export class PlayerInfo extends HTMLElement {
  /**
   * Create a player info element.
   *
   * @pseudocode
   * 1. Call `super()` to initialize `HTMLElement`.
   * 2. Set initial `textContent` to the provided `text` or "Player".
   *
   * @param {string} [text="Player"] - Initial text content.
   */
  constructor(text = "Player") {
    super();
    this._defaultText = text;
    this.textContent = text;
  }

  static get observedAttributes() {
    return ["name"];
  }

  connectedCallback() {
    this._updateText();
  }

  attributeChangedCallback() {
    this._updateText();
  }

  _updateText() {
    const nameAttr = this.getAttribute("name");
    this.textContent = nameAttr && nameAttr.trim() ? nameAttr : this._defaultText;
  }
}

customElements.define("player-info", PlayerInfo);
