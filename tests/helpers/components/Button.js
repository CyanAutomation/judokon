import { vi } from "vitest";

/**
 * Create a mock Button factory for testing.
 * Mimics the behavior of the real createButton function with styling and icon support.
 *
 * @param {string} text - Button text
 * @param {object} [options] - Optional configuration
 * @param {string} [options.id] - Element id
 * @param {string} [options.className] - Additional class names
 * @param {string} [options.type="button"] - Button type
 * @param {string} [options.icon] - SVG markup for icon
 * @param {string} [options.dataTestId] - Data test id
 * @returns {object} Mock button with element and control methods
 */
export function createButton(text, options = {}) {
  const { id, className, type = "button", icon, dataTestId } = options;

  // Create button element
  const element = document.createElement("button");
  element.type = type;

  // Handle icon if provided
  if (icon) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(icon, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");
    if (svgElement) {
      svgElement.setAttribute("aria-hidden", "true");
      element.appendChild(svgElement);
    } else {
      // Suppress noisy warning in tests; real component covers this path separately
    }
    const labelSpan = document.createElement("span");
    labelSpan.className = "button-label";
    labelSpan.textContent = text;
    element.appendChild(labelSpan);
  } else {
    element.textContent = text;
  }

  // Apply styling (mimic real component)
  element.style.backgroundColor = "var(--button-bg)";
  element.style.color = "var(--button-text-color)";

  // Apply attributes
  if (id) element.id = id;
  if (className) element.className = className;
  if (dataTestId) element.dataset.testid = dataTestId;

  // Event spy
  const onClick = vi.fn();

  // Attach click listener to track calls
  element.addEventListener("click", onClick);

  // Helper methods
  const click = () => {
    element.click();
  };

  const setText = (newText) => {
    if (icon) {
      const labelSpan = element.querySelector(".button-label");
      if (labelSpan) {
        labelSpan.textContent = newText;
      }
    } else {
      element.textContent = newText;
    }
  };

  const setDisabled = (disabled) => {
    element.disabled = disabled;
  };

  return {
    element,
    click,
    setText,
    setDisabled,
    onClick
  };
}
