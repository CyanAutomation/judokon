/**
 * Create a styled button element using design tokens.
 *
 * @pseudocode
 * 1. Create a `button` element.
 * 2. Apply provided text and attributes such as `id`, `className` and `type`.
 * 3. Optionally prepend an icon before the text when `icon` is provided.
 * 4. Set inline styles referencing `--button-bg` and `--button-text-color`.
 * 5. Return the configured button element.
 *
 * @param {string} text - The button label.
 * @param {object} [options] - Optional settings.
 * @param {string} [options.id] - Id attribute for the button.
 * @param {string} [options.className] - Additional class names.
 * @param {string} [options.type="button"] - Button type attribute.
 * @param {string} [options.icon] - SVG markup inserted before the label.
 * @returns {HTMLButtonElement} The styled button element.
 */
export function createButton(text, options = {}) {
  const { id, className, type = "button", icon, "data-testid": dataTestId } = options;
  const button = document.createElement("button");
  button.type = type;
  if (icon) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(icon, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");
    if (svgElement) {
      svgElement.setAttribute("aria-hidden", "true");
      button.appendChild(svgElement);
    } else {
      console.warn("Invalid SVG markup provided for icon.");
    }
    const labelSpan = document.createElement("span");
    labelSpan.className = "button-label";
    labelSpan.textContent = text;
    button.appendChild(labelSpan);
  } else {
    button.textContent = text;
  }
  button.style.backgroundColor = "var(--button-bg)";
  button.style.color = "var(--button-text-color)";
  if (id) button.id = id;
  if (className) button.className = className;
  if (dataTestId) button.dataset.testid = dataTestId;
  return button;
}
