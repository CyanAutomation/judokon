/**
 * Create a reusable modal dialog with accessible behavior.
 *
 * @pseudocode
 * 1. Create a native `<dialog>` element with the `modal` class.
 * 2. Apply `aria-labelledby` / `aria-describedby` when IDs are supplied.
 * 3. Append the provided content into the dialog element.
 * 4. Track the element that triggered the modal so focus can be restored.
 * 5. Expose `open()` to call `showModal()` (or set `open`) and manage
 *    `aria-expanded` on the trigger when supplied.
 * 6. Expose `close()` to call the native `close()` (or unset `open`).
 * 7. Listen for the dialog's `close` event to restore focus and clean up.
 * 8. Provide `destroy()` to remove listeners, close the dialog, and detach it.
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

    this.dialog = document.createElement("dialog");
    this.dialog.className = "modal";
    this.dialog.tabIndex = -1;
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

    this.dialog.append(content);

    this.element = this.dialog;

    this.returnFocus = null;
    this.pendingFocusHandle = null;
    this.pendingFocusCancel = null;
    this.handleClose = this.handleClose.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.dialog.addEventListener("close", this.handleClose);
    this.dialog.addEventListener("cancel", this.handleCancel);

    this.supportsShowModal = typeof this.dialog.showModal === "function";
    this.supportsClose = typeof this.dialog.close === "function";
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  /**
   * Handle the dialog `close` event by restoring trigger focus.
   *
   * @pseudocode
   * 1. Capture and clear the stored trigger element.
   * 2. If a trigger exists, set `aria-expanded="false"` and refocus it.
   *
   * @private
   * @returns {void}
   */
  handleClose() {
    this.cancelPendingFocus();
    const trigger = this.returnFocus;
    this.returnFocus = null;
    if (trigger) {
      try {
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      } catch {}
    }
  }

  /**
   * Handle the dialog `cancel` event (Escape / form cancel).
   *
   * @pseudocode
   * 1. When native `showModal` is unavailable, prevent default dismissal.
   * 2. Call `close()` to emulate the native closing behavior.
   *
   * @param {Event} event - The cancel event.
   * @returns {void}
   */
  handleCancel(event) {
    if (!this.supportsShowModal) {
      try {
        event?.preventDefault?.();
      } catch {}
      this.close();
    }
    // Native dialogs handle cancel semantics when `showModal` is supported.
  }

  /**
   * Determine whether the dialog is currently open.
   *
   * @pseudocode
   * 1. Check for the native `open` property when supported.
   * 2. Fallback to the presence of the `open` attribute for polyfilled dialogs.
   *
   * @private
   * @returns {boolean}
   */
  isDialogOpen() {
    return this.dialog.hasAttribute("open") || Boolean(this.dialog.open);
  }

  /**
   * Cancel any queued focus retry to avoid stealing focus after close.
   *
   * @pseudocode
   * 1. If a cancel handler exists, invoke it with the stored handle.
   * 2. Clear the pending handle and cancel reference.
   *
   * @private
   * @returns {void}
   */
  cancelPendingFocus() {
    if (this.pendingFocusCancel) {
      try {
        this.pendingFocusCancel(this.pendingFocusHandle);
      } catch {}
    }
    this.pendingFocusHandle = null;
    this.pendingFocusCancel = null;
  }

  /**
   * Queue a single deferred focus callback aligned with the next frame.
   *
   * @pseudocode
   * 1. Cancel any existing pending focus callback.
   * 2. Prefer `requestAnimationFrame` when available for deterministic timing.
   * 3. Fallback to a short timeout if animation frames are unavailable.
   *
   * @private
   * @param {Function} callback - Callback to invoke on the next frame.
   * @returns {void}
   */
  queueDeferredFocus(callback) {
    this.cancelPendingFocus();

    const hasAnimationFrame =
      typeof requestAnimationFrame === "function" &&
      typeof cancelAnimationFrame === "function";

    if (hasAnimationFrame) {
      this.pendingFocusCancel = cancelAnimationFrame;
      this.pendingFocusHandle = requestAnimationFrame(() => {
        this.pendingFocusHandle = null;
        this.pendingFocusCancel = null;
        callback();
      });
      return;
    }

    this.pendingFocusCancel = clearTimeout;
    this.pendingFocusHandle = setTimeout(() => {
      this.pendingFocusHandle = null;
      this.pendingFocusCancel = null;
      callback();
    }, 10);
  }

  /**
   * Manage the initial focus placement within the dialog contents.
   *
   * @pseudocode
   * 1. Clear any pending focus retries from prior dialog activity.
   * 2. Query for the first focusable control within the dialog.
   * 3. Attempt to focus that control immediately.
   * 4. Queue a guarded deferred retry, falling back to the dialog element.
   *
   * @private
   * @returns {void}
   */
  applyInitialFocus() {
    this.cancelPendingFocus();
    try {
      const focusableSelector =
        "[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), [contenteditable]:not([contenteditable='false'])";
      const focusTarget = this.dialog.querySelector(focusableSelector);
      const attemptFocus = (element) => {
        if (!element) {
          return false;
        }
        try {
          element.focus();
        } catch {
          return false;
        }
        return document.activeElement === element;
      };

      const focusDialogFallback = () => {
        if (!attemptFocus(this.dialog)) {
          try {
            this.dialog.focus();
          } catch {}
        }
      };
      if (focusTarget) {
        attemptFocus(focusTarget);
        this.queueDeferredFocus(() => {
          if (!this.isDialogOpen()) {
            return;
          }
          const activeElement = document.activeElement;
          if (
            activeElement &&
            activeElement !== this.dialog &&
            activeElement !== focusTarget &&
            !this.dialog.contains(activeElement)
          ) {
            return;
          }
          if (!attemptFocus(focusTarget)) {
            focusDialogFallback();
          }
        });
      } else {
        focusDialogFallback();
      }
    } catch {}
  }

  /**
   * Opens the modal dialog, makes it visible, and manages focus.
   *
   * @pseudocode
   * 1. Store the optional trigger element so focus can be restored later.
   * 2. Mark the trigger as expanded when provided.
   * 3. Call the native `showModal()` API when available, otherwise set the
   *    `open` attribute manually as a graceful fallback.
   * 4. Focus the first interactive control (or the dialog) so keyboard users land inside the modal content.
   *
   * @param {HTMLElement} [trigger] - The element that triggered the modal to open, used for focus management.
   * @returns {void}
   */
  open(trigger) {
    this.returnFocus = trigger ?? null;
    if (trigger) {
      try {
        trigger.setAttribute("aria-expanded", "true");
      } catch {}
    }

    if (this.supportsShowModal) {
      if (!this.dialog.hasAttribute("open")) {
        try {
          this.dialog.showModal();
        } catch {
          this.dialog.setAttribute("open", "");
        }
      }
    } else {
      this.dialog.setAttribute("open", "");
    }

    this.applyInitialFocus();
  }

  /**
   * Closes the modal dialog, hides it, and restores focus to the triggering element.
   *
   * @pseudocode
   * 1. No-op if the dialog is already closed.
   * 2. Invoke the native `close()` method when present, otherwise remove the
   *    `open` attribute and dispatch a synthetic `close` event so listeners run.
   *
   * @returns {void}
   */
  close() {
    this.cancelPendingFocus();
    const isOpen = this.dialog.hasAttribute("open") || this.dialog.open;
    if (!isOpen) {
      return;
    }

    if (this.supportsClose) {
      try {
        this.dialog.close();
        return;
      } catch {}
    }

    this.dialog.removeAttribute("open");
    this.dialog.dispatchEvent(new Event("close"));
  }

  /**
   * Remove event listeners and detach the modal element.
   * @returns {void}
   */
  destroy() {
    try {
      this.dialog.removeEventListener("close", this.handleClose);
    } catch {}
    try {
      this.dialog.removeEventListener("cancel", this.handleCancel);
    } catch {}
    try {
      this.close();
    } catch {}
    this.cancelPendingFocus();
    this.dialog.remove();
    this.returnFocus = null;
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
