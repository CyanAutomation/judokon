import { vi } from "vitest";

/**
 * Create a mock Card factory for testing.
 * Provides a basic card container with content insertion and event handling.
 *
 * @param {string|HTMLElement|DocumentFragment} [content] - Card content
 * @param {object} [options] - Optional configuration
 * @param {string} [options.className] - Additional class names
 * @param {boolean} [options.clickable=false] - Whether card should be clickable
 * @returns {object} Mock card with element and control methods
 */
export function createCard(content, options = {}) {
  const { className, clickable = false } = options;

  // Create card element
  const element = document.createElement("div");
  element.className = "card";

  if (className) {
    element.classList.add(className);
  }

  if (clickable) {
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
  }

  // Add content if provided
  if (content) {
    if (typeof content === "string") {
      element.innerHTML = content;
    } else if (content instanceof HTMLElement || content instanceof DocumentFragment) {
      element.appendChild(content);
    }
  }

  // Event spy
  const onClick = vi.fn();

  // Attach click listener if clickable
  if (clickable) {
    element.addEventListener("click", onClick);
  }

  // Helper methods
  const updateContent = (newContent) => {
    // Clear existing content
    element.innerHTML = "";

    if (typeof newContent === "string") {
      element.innerHTML = newContent;
    } else if (newContent instanceof HTMLElement || newContent instanceof DocumentFragment) {
      element.appendChild(newContent);
    }
  };

  const setClassName = (newClassName) => {
    element.className = "card";
    if (newClassName) {
      element.classList.add(newClassName);
    }
  };

  return {
    element,
    updateContent,
    setClassName,
    onClick
  };
}
