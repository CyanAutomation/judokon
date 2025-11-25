/**
 * @module Card
 * @summary Basic card component for rendering judoka card containers with flexible content
 * @description Flexible card container class that supports both `<div>` and `<a>` elements
 *              with sanitized HTML content, optional classes, click handlers, and IDs.
 *              Used throughout the application for rendering judoka cards, stat cards,
 *              and other content cards with consistent styling and behavior.
 * @keywords card, component, render, judoka-card, container, ui-component
 */

/**
 * Basic card container class.
 *
 * @pseudocode
 * 1. Choose a `<div>` or `<a>` element based on the presence of `href`.
 * 2. Add the base `card` class and exit early when no options or content exist.
 * 3. Apply `id`, `href`, optional classes and `onClick` via helpers.
 * 4. Insert string or Node content using a helper that sanitizes HTML when requested.
 *
 * @class
 */
import { getSanitizer } from "../helpers/sanitizeHtml.js";
import { getDocumentRef } from "../helpers/documentHelper.js";

function applyClasses(el, className) {
  if (!className) return;
  for (const cls of className.split(/\s+/)) {
    if (cls) el.classList.add(cls);
  }
}

function insertContent(el, content, html, sanitize) {
  if (!content) return;
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
  if (content instanceof Node) el.append(content);
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
    const doc = getDocumentRef();
    if (!doc) {
      // Add debugging info to window for test debugging
      try {
        if (typeof globalThis !== "undefined" && globalThis.window) {
          if (!globalThis.window.__CARD_DEBUG_LOG) {
            globalThis.window.__CARD_DEBUG_LOG = [];
          }
          globalThis.window.__CARD_DEBUG_LOG.push({
            timestamp: Date.now(),
            typeofDocument: typeof document,
            typeofWindow: typeof globalThis?.window,
            globalThisExists: !!globalThis,
            globalThisDocument: !!globalThis?.document,
            globalWindow: !!globalThis?.window,
            globalWindowDocument: !!globalThis?.window?.document
          });
        }
      } catch (_err) {
        // silently ignore
      }
      throw new Error("Card: Unable to access document (JSDOM or DOM environment required)");
    }
    this.element = href ? doc.createElement("a") : doc.createElement("div");
    this.element.classList.add("card");
    if (!content && !id && !className && !onClick && !href) return;
    if (id) this.element.id = id;
    if (href) this.element.href = href;
    if (typeof onClick === "function") this.element.addEventListener("click", onClick);
    applyClasses(this.element, className);
    insertContent(this.element, content, html, sanitize);
  }
}

/**
 * Factory wrapper for backward compatibility with function callers.
 *
 * @pseudocode
 * 1. Create a new Card instance.
 * 2. Return the card's element.
 *
 * @param {string|Node} content - Text or HTML to place inside the card.
 * @param {object} [options] - Optional settings passed to the `Card` constructor.
 * @returns {HTMLElement} The card element.
 */
export function createCard(content, options = {}) {
  return new Card(content, options).element;
}
