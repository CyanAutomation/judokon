/**
 * Create a reusable modal dialog with accessible behavior.
 *
 * @pseudocode
 * 1. Build a backdrop element with `modal-backdrop` class and `hidden` attribute.
 * 2. Inside it place a `div.modal` with `role="dialog"` and `aria-modal="true"`.
 * 3. When options include `labelledBy` or `describedBy`, set
 *    `aria-labelledby` and `aria-describedby` on the modal.
 * 4. Append provided content nodes into the modal.
 * 5. Expose `open()` and `close()` instance methods to toggle the backdrop,
 *    manage focus and `aria-expanded` on the trigger.
 * 6. Clicking the backdrop or pressing Escape closes the modal.
 * 7. While open, trap focus inside the modal container.
 * 8. Provide `destroy()` to remove listeners and detach the element.
 *
 * @param {HTMLElement|DocumentFragment} content - Dialog contents.
 * @param {object} [options] - Optional configuration.
 * @param {string|HTMLElement} [options.labelledBy] - ID string or element used
 *   for `aria-labelledby`.
 * @param {string|HTMLElement} [options.describedBy] - ID string or element used
 *   for `aria-describedby`.
 */
export class Modal {
  constructor(content, options = {}) {
    const { labelledBy, describedBy } = options;

    this.element = document.createElement("div");
    this.element.className = "modal-backdrop";
    this.element.setAttribute("hidden", "");

    this.dialog = document.createElement("div");
    this.dialog.className = "modal";
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    if (labelledBy) {
      const id = typeof labelledBy === "string" ? labelledBy : labelledBy.id;
      if (id) this.dialog.setAttribute("aria-labelledby", id);
    }
    if (describedBy) {
      const id = typeof describedBy === "string" ? describedBy : describedBy.id;
      if (id) this.dialog.setAttribute("aria-describedby", id);
    }
    this.dialog.tabIndex = -1;

    this.dialog.append(content);
    this.element.append(this.dialog);

    this.returnFocus = null;
    this.removeTrap = () => {};

    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleEscape = this.handleEscape.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.element.addEventListener("click", this.handleBackdropClick);
  }

  /**
   * Trap focus within the given element.
   * @param {HTMLElement} el
   * @returns {() => void} Cleanup function.
   */
  trapFocus(el) {
    const selectors = "a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])";
    const focusables = Array.from(el.querySelectorAll(selectors));
    if (focusables.length === 0) return () => {};
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const handle = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener("keydown", handle);
    return () => el.removeEventListener("keydown", handle);
  }

  handleEscape(e) {
    if (e.key === "Escape") this.close();
  }

  handleBackdropClick(e) {
    if (e.target === this.element) this.close();
  }

  open(trigger) {
    this.returnFocus = trigger ?? null;
    this.element.removeAttribute("hidden");
    this.dialog.classList.add("open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    this.removeTrap = this.trapFocus(this.dialog);
    const focusTarget = this.dialog.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    (focusTarget || this.dialog).focus();
    document.addEventListener("keydown", this.handleEscape);
  }

  close() {
    this.dialog.classList.remove("open");
    this.element.setAttribute("hidden", "");
    this.removeTrap();
    document.removeEventListener("keydown", this.handleEscape);
    if (this.returnFocus) {
      this.returnFocus.setAttribute("aria-expanded", "false");
      this.returnFocus.focus();
    }
  }

  /**
   * Remove event listeners and detach the modal element.
   * @returns {void}
   */
  destroy() {
    this.element.removeEventListener("click", this.handleBackdropClick);
    document.removeEventListener("keydown", this.handleEscape);
    this.element.remove();
  }
}

/**
 * Compatibility helper returning a `Modal` instance.
 *
 * @param {HTMLElement|DocumentFragment} content
 * @param {object} [options]
 * @returns {Modal}
 */
export function createModal(content, options = {}) {
  return new Modal(content, options);
}
