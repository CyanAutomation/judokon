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
   * Traps focus within a given element, ensuring keyboard navigation stays within its boundaries.
   *
   * @pseudocode
   * 1. Define a string of CSS selectors for common focusable elements (links, buttons, inputs, etc.).
   * 2. Query all elements within the provided `el` that match these selectors to get a list of `focusables`.
   * 3. If `focusables` is empty (no focusable elements found), return an empty function immediately as there's nothing to trap.
   * 4. Identify the `first` and `last` focusable elements from the `focusables` list.
   * 5. Define a `handle` function to serve as the keydown event listener:
   *    a. Check if the pressed key (`e.key`) is "Tab". If not, exit the handler.
   *    b. If "Shift" key is also pressed (`e.shiftKey`) AND the currently active element (`document.activeElement`) is the `first` focusable element:
   *       i. Prevent the default tab behavior (`e.preventDefault()`).
   *       ii. Move focus to the `last` focusable element.
   *    c. Else if "Shift" key is NOT pressed AND the currently active element is the `last` focusable element:
   *       i. Prevent the default tab behavior (`e.preventDefault()`).
   *       ii. Move focus to the `first` focusable element.
   * 6. Add the `handle` function as a "keydown" event listener to the `el` element.
   * 7. Return a cleanup function that, when called, will remove the "keydown" event listener from `el`, effectively disabling the focus trap.
   *
   * @param {HTMLElement} el - The element within which to trap focus.
   * @returns {() => void} A function to call to remove the focus trap.
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

  /**
   * Handles the keydown event to close the modal when the Escape key is pressed.
   *
   * @pseudocode
   * 1. Check if the pressed key is 'Escape'.
   * 2. If it is, close the modal.
   *
   * @param {KeyboardEvent} e - The keyboard event object.
   * @returns {void}
   */
  handleEscape(e) {
    if (e.key === "Escape") this.close();
  }

  /**
   * Handles clicks on the modal backdrop to close the modal.
   *
   * @pseudocode
   * 1. Check if the click target is the modal backdrop element itself.
   * 2. If it is, close the modal.
   *
   * @param {MouseEvent} e - The mouse event object.
   * @returns {void}
   */
  handleBackdropClick(e) {
    if (e.target === this.element) this.close();
  }

  /**
   * Opens the modal dialog, makes it visible, and manages focus.
   *
   * @pseudocode
   * 1. Store the triggering element to return focus to it later.
   * 2. Remove the 'hidden' attribute from the modal backdrop.
   * 3. Add the 'open' class to the dialog for styling.
   * 4. If a trigger element exists, set its 'aria-expanded' attribute to 'true'.
   * 5. Activate focus trapping within the dialog.
   * 6. Identify the first focusable element within the dialog and move focus to it.
   * 7. Add a keydown event listener to the document for handling the Escape key.
   *
   * @param {HTMLElement} [trigger] - The element that triggered the modal to open, used for focus management.
   * @returns {void}
   */
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

  /**
   * Closes the modal dialog, hides it, and restores focus to the triggering element.
   *
   * @pseudocode
   * 1. Remove the 'open' class from the dialog.
   * 2. Set the 'hidden' attribute on the modal backdrop.
   * 3. Deactivate the focus trap.
   * 4. Remove the keydown event listener for handling the Escape key.
   * 5. If a triggering element was stored, set its 'aria-expanded' attribute to 'false' and return focus to it.
   * 6. Dispatch a `close` event on the modal backdrop.
   *
   * @returns {void}
   */
  close() {
    this.dialog.classList.remove("open");
    this.element.setAttribute("hidden", "");
    this.removeTrap();
    document.removeEventListener("keydown", this.handleEscape);
    if (this.returnFocus) {
      this.returnFocus.setAttribute("aria-expanded", "false");
      this.returnFocus.focus();
    }
    this.element.dispatchEvent(new CustomEvent("close"));
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
 * @pseudocode
 * 1. Instantiate a `Modal` with the supplied `content` and `options`.
 * 2. Return the newly created instance.
 *
 * @param {HTMLElement|DocumentFragment} content
 * @param {object} [options]
 * @returns {Modal}
 */
export function createModal(content, options = {}) {
  return new Modal(content, options);
}
