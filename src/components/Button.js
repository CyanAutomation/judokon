/**
 * Create a styled button element using design tokens.
 *
 * @pseudocode
 * 1. Create a `button` element.
 * 2. Apply provided text and attributes such as `id`, `className` and `type`.
 * 3. Set inline styles referencing `--button-bg` and `--button-text-color`.
 * 4. Return the configured button element.
 *
 * @param {string} text - The button label.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.id] - Id attribute for the button.
 * @param {string} [options.className] - Additional class names.
 * @param {string} [options.type="button"] - Button type attribute.
 * @returns {HTMLButtonElement} The styled button element.
 */
export function createButton(text, options = {}) {
  const { id, className, type = "button" } = options;
  const button = document.createElement("button");
  button.type = type;
  button.textContent = text;
  button.style.backgroundColor = "var(--button-bg)";
  button.style.color = "var(--button-text-color)";
  if (id) button.id = id;
  if (className) button.className = className;
  return button;
}
