/**
 * Create a basic card container element.
 *
 * @pseudocode
 * 1. Use an `<article>` element by default or an `<a>` element when `href` is provided.
 * 2. Apply `id`, `href`, `className` and `onClick` options if present.
 * 3. Always include the `card` class plus any additional `className`.
 * 4. Insert string content via `innerHTML` or append a DOM node directly.
 * 5. Return the configured element.
 *
 * @param {string|Node} content - Markup string or DOM node to place inside the card.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.id] - Id attribute for the element.
 * @param {string} [options.className] - Extra class names.
 * @param {string} [options.href] - If set, create an `<a>` element with this href.
 * @param {Function} [options.onClick] - Click handler attached to the element.
 * @returns {HTMLElement} The card element.
 */
export function createCard(content, options = {}) {
  const { id, className, href, onClick } = options;
  const element = href ? document.createElement("a") : document.createElement("article");
  if (id) element.id = id;
  if (href) element.href = href;
  element.classList.add("card");
  if (className) element.classList.add(className);
  if (typeof onClick === "function") {
    element.addEventListener("click", onClick);
  }
  if (typeof content === "string") {
    element.innerHTML = content;
  } else if (content instanceof Node) {
    element.append(content);
  }
  return element;
}
