import { vi } from "vitest";

/**
 * Create a lightweight dialog-backed modal test double.
 *
 * @param {HTMLElement|DocumentFragment} content - Dialog contents
 * @param {object} [options] - Optional configuration
 * @param {string|HTMLElement} [options.labelledBy] - ID or element for aria-labelledby
 * @param {string|HTMLElement} [options.describedBy] - ID or element for aria-describedby
 * @returns {{ element: HTMLDialogElement, dialog: HTMLDialogElement, open(trigger?: HTMLElement): void, close(): void, destroy(): void, onOpen: ReturnType<typeof vi.fn>, onClose: ReturnType<typeof vi.fn>, get isOpen(): boolean }}
 */
export function createModal(content, options = {}) {
  const { labelledBy, describedBy } = options;

  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.tabIndex = -1;

  if (labelledBy) {
    const id = typeof labelledBy === "string" ? labelledBy : labelledBy.id;
    if (id) dialog.setAttribute("aria-labelledby", id);
  }

  if (describedBy) {
    const id = typeof describedBy === "string" ? describedBy : describedBy.id;
    if (id) dialog.setAttribute("aria-describedby", id);
  }

  dialog.append(content);

  let returnFocusElement = null;
  const onOpen = vi.fn();
  const onClose = vi.fn();

  const open = (trigger) => {
    returnFocusElement = trigger || null;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "true");
    }
    dialog.setAttribute("open", "");
    dialog.focus();
    onOpen(trigger || undefined);
  };

  const close = () => {
    if (!dialog.hasAttribute("open")) return;
    dialog.removeAttribute("open");
    const trigger = returnFocusElement;
    returnFocusElement = null;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
    dialog.dispatchEvent(new Event("close"));
    onClose();
  };

  const destroy = () => {
    close();
    if (dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  };

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  return {
    element: dialog,
    dialog,
    open,
    close,
    destroy,
    onOpen,
    onClose,
    get isOpen() {
      return dialog.hasAttribute("open");
    }
  };
}
