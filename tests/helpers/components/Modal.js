import { vi } from "vitest";

/**
 * Create a mock Modal factory for testing.
 * Mimics the behavior of the real Modal component with focus management and ARIA attributes.
 *
 * @param {HTMLElement|DocumentFragment} content - Dialog contents
 * @param {object} [options] - Optional configuration
 * @param {string|HTMLElement} [options.labelledBy] - ID or element for aria-labelledby
 * @param {string|HTMLElement} [options.describedBy] - ID or element for aria-describedby
 * @returns {object} Mock modal with element and control methods
 */
export function createModal(content, options = {}) {
  const { labelledBy, describedBy } = options;

  // Create backdrop element
  const element = document.createElement("div");
  element.className = "modal-backdrop";
  element.setAttribute("hidden", "");

  // Create dialog element
  const dialog = document.createElement("div");
  dialog.className = "modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.tabIndex = -1;

  // Set ARIA attributes
  if (labelledBy) {
    const id = typeof labelledBy === "string" ? labelledBy : labelledBy.id;
    if (id) dialog.setAttribute("aria-labelledby", id);
  }
  if (describedBy) {
    const id = typeof describedBy === "string" ? describedBy : describedBy.id;
    if (id) dialog.setAttribute("aria-describedby", id);
  }

  // Append content and assemble DOM
  dialog.append(content);
  element.append(dialog);

  // State tracking
  let isOpen = false;
  let returnFocusElement = null;

  // Event spies
  const onOpen = vi.fn();
  const onClose = vi.fn();

  // Mock focus management
  const open = (trigger) => {
    element.removeAttribute("hidden");
    isOpen = true;
    returnFocusElement = trigger;

    // Set aria-expanded on trigger if provided
    if (trigger) {
      trigger.setAttribute("aria-expanded", "true");
    }

    // Focus the dialog
    dialog.focus();

    onOpen(trigger);
  };

  const close = () => {
    element.setAttribute("hidden", "");
    isOpen = false;

    // Return focus to trigger
    if (returnFocusElement) {
      returnFocusElement.setAttribute("aria-expanded", "false");
      returnFocusElement.focus();
    }

    onClose();
  };

  const destroy = () => {
    // Cleanup - remove from DOM if attached
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    // Reset state
    isOpen = false;
    returnFocusElement = null;
  };

  // Backdrop click to close (mimics real behavior)
  element.addEventListener("click", (e) => {
    if (e.target === element) {
      close();
    }
  });

  return {
    element,
    dialog,
    open,
    close,
    destroy,
    get isOpen() {
      return isOpen;
    },
    onOpen,
    onClose
  };
}
