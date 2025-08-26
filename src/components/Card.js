/**
 * Basic card container class.
 *
 * @pseudocode
 * 1. Use a `<div>` element by default or an `<a>` element when `href` is provided.
 * 2. Apply `id`, `href` and `onClick` when present.
 * 3. Always include the `card` class plus any additional `className` via helper.
 * 4. Insert string or node content with optional HTML sanitization via helper.
 *
 * @class
 */
import { getSanitizer } from "../helpers/sanitizeHtml.js";

/**
 * Adds optional classes to an element.
 *
 * @pseudocode
 * 1. Return early if `className` is falsy.
 * 2. Split the class string on whitespace.
 * 3. Add each non-empty class to the element.
 *
 * @param {HTMLElement} el - Element to modify.
 * @param {string} [className] - Space-separated classes to add.
 */
function applyClasses(el, className) {
  if (!className) return;
  for (const cls of className.split(/\s+/)) {
    if (cls) el.classList.add(cls);
  }
}

/**
 * Inserts content into an element with optional HTML sanitization.
 *
 * @pseudocode
 * 1. Return early if `content` is null or undefined.
 * 2. If `content` is a string:
 *    a. When `html` is false, assign to `textContent` and return.
 *    b. When `html` is true, load the sanitizer (async or sync) and set `innerHTML`.
 * 3. If `content` is a Node, append it.
 *
 * @param {HTMLElement} el - Element to receive content.
 * @param {string|Node} content - Text or DOM node.
 * @param {{html:boolean, sanitize:Function}} opts - Content options.
 */
function insertContent(el, content, { html, sanitize }) {
  if (content === undefined || content === null) return;
  if (typeof content === "string") {
    if (!html) {
      el.textContent = content;
      return;
    }
    const maybe = sanitize();
    if (typeof maybe?.then === "function") {
      maybe.then(({ sanitize: fn }) => {
        el.innerHTML = fn(content);
      });
    } else {
      el.innerHTML = maybe.sanitize(content);
    }
    return;
  }
  if (content instanceof Node) {
    el.append(content);
  }
}

export class Card {
  /**
   * @param {string|Node} content - Text or HTML to place inside the card.
   * @param {{id?: string, className?: string, href?: string, onClick?: Function, html?: boolean, sanitize?: Function}} [options] - Optional settings.
   *    When `html` is true, the `content` string is sanitized before insertion.
   *    The `sanitize` option may return a sanitizer synchronously or as a Promise
   *    and defaults to `getSanitizer`.
   */
  constructor(content, options = {}) {
    const { id, className, href, onClick, html = false, sanitize = getSanitizer } = options;
    this.element = href ? document.createElement("a") : document.createElement("div");
    this.element.classList.add("card");
    if (
      (content === undefined || content === null) &&
      !id &&
      !className &&
      !href &&
      typeof onClick !== "function" &&
      !html
    )
      return;
    if (id) this.element.id = id;
    if (href) this.element.href = href;
    if (typeof onClick === "function") this.element.addEventListener("click", onClick);
    applyClasses(this.element, className);
    insertContent(this.element, content, { html, sanitize });
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
