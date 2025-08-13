/**
 * Basic card container class.
 *
 * @pseudocode
 * 1. Use a `<div>` element by default or an `<a>` element when `href` is provided.
 * 2. Apply `id`, `href`, `className` and `onClick` options if present.
 * 3. Always include the `card` class plus any additional `className`.
 * 4. Insert string content with `textContent` by default, or with `innerHTML`
 *    when `html` is true.
 *
 * @class
 */
export class Card {
  /**
   * @param {string|Node} content - Text or HTML to place inside the card.
   * @param {{id?: string, className?: string, href?: string, onClick?: Function, html?: boolean}} [options] - Optional settings. When `html` is true, `content` must be pre-sanitized.
   */
  constructor(content, options = {}) {
    const { id, className, href, onClick, html = false } = options;
    this.element = href ? document.createElement("a") : document.createElement("div");
    if (id) this.element.id = id;
    if (href) this.element.href = href;
    this.element.classList.add("card");
    if (className) {
      for (const cls of className.split(/\s+/)) {
        if (cls) this.element.classList.add(cls);
      }
    }
    if (typeof onClick === "function") {
      this.element.addEventListener("click", onClick);
    }
    if (typeof content === "string") {
      if (html) {
        this.element.innerHTML = content;
      } else {
        this.element.textContent = content;
      }
    } else if (content instanceof Node) {
      this.element.append(content);
    }
  }
}

/**
 * Factory wrapper for backward compatibility with function callers.
 *
 * @param {string|Node} content - Text or HTML to place inside the card.
 * @param {object} [options] - Optional settings passed to the `Card` constructor.
 * @returns {HTMLElement} The card element.
 */
export function createCard(content, options = {}) {
  return new Card(content, options).element;
}
