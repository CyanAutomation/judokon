/**
 * Modal positioning utilities for round select modal.
 * Splits RoundSelectPositioner into focused, testable classes.
 *
 * @module modalPositioning
 */

import { rafDebounce } from "../../utils/rafUtils.js";
import { ROUND_SELECT_UI, POSITIONER_PROPS } from "../../config/roundSelectConstants.js";

/**
 * Manages modal positioning relative to page header.
 *
 * @class ModalPositioner
 */
class ModalPositioner {
  /**
   * Create a modal positioner.
   *
   * @param {HTMLElement} backdrop - Modal backdrop element.
   * @param {HTMLElement} header - Header element to position relative to.
   */
  constructor(backdrop, header) {
    this.backdrop = backdrop;
    this.header = header;
    this.isActive = false;
    this.onResize = null;
  }

  /**
   * Attach resize listeners for dynamic positioning.
   *
   * @pseudocode
   * 1. Create debounced resize handler that calls updateInset().
   * 2. Attach to window resize and orientationchange events.
   * 3. Store handler reference for cleanup.
   */
  attachListeners() {
    this.onResize = rafDebounce(() => {
      if (!this.isActive) {
        return;
      }
      this.updateInset();
    });

    try {
      window.addEventListener("resize", this.onResize);
      window.addEventListener("orientationchange", this.onResize);
    } catch {}
  }

  /**
   * Update modal top inset based on header height.
   *
   * @pseudocode
   * 1. Check if positioning is active.
   * 2. Get header offsetHeight.
   * 3. Set CSS custom property --modal-inset-top to header height.
   * 4. Add header-aware CSS class to backdrop.
   */
  updateInset() {
    if (!this.isActive || !this.backdrop || !this.header) {
      return;
    }

    try {
      const height = this.header.offsetHeight;
      if (Number.isFinite(height) && height >= 0) {
        this.backdrop.style.setProperty("--modal-inset-top", `${height}px`);
        this.backdrop.classList.add(ROUND_SELECT_UI.CSS_CLASSES.HEADER_AWARE);
      }
    } catch {}
  }

  /**
   * Activate positioning.
   */
  activate() {
    this.isActive = true;
    this.updateInset();
  }

  /**
   * Deactivate positioning and remove listeners.
   *
   * @pseudocode
   * 1. Set isActive to false.
   * 2. Remove resize and orientationchange listeners.
   */
  cleanup() {
    this.isActive = false;
    if (this.onResize) {
      try {
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("orientationchange", this.onResize);
      } catch {}
    }
  }
}

/**
 * Manages modal lifecycle hooks (close, destroy).
 *
 * @class ModalLifecycleManager
 */
class ModalLifecycleManager {
  /**
   * Create a lifecycle manager.
   *
   * @param {object} modal - Modal instance.
   * @param {HTMLElement} backdrop - Modal backdrop element.
   * @param {Function} cleanupCallback - Callback to invoke on close/destroy.
   */
  constructor(modal, backdrop, cleanupCallback) {
    this.modal = modal;
    this.backdrop = backdrop;
    this.cleanupCallback = cleanupCallback;
    this.originalClose = null;
    this.originalDestroy = null;
    this.originalDispatchEvent = null;
  }

  /**
   * Capture original lifecycle methods before patching.
   *
   * @pseudocode
   * 1. Save reference to modal.close() if it exists.
   * 2. Save reference to modal.destroy() if it exists.
   * 3. Save reference to backdrop.dispatchEvent() if it exists.
   * 4. Bind methods to preserve 'this' context.
   */
  captureOriginalMethods() {
    this.originalClose =
      typeof this.modal?.close === "function" ? this.modal.close.bind(this.modal) : null;
    this.originalDestroy =
      typeof this.modal?.destroy === "function" ? this.modal.destroy.bind(this.modal) : null;
    this.originalDispatchEvent =
      typeof this.backdrop?.dispatchEvent === "function"
        ? this.backdrop.dispatchEvent.bind(this.backdrop)
        : null;
  }

  /**
   * Patch lifecycle methods to trigger cleanup.
   *
   * @pseudocode
   * 1. Wrap dispatchEvent to call cleanup on 'close' event.
   * 2. Wrap modal.close() to call cleanup after closing.
   * 3. Wrap modal.destroy() to call cleanup before destroying.
   */
  patchMethods() {
    if (this.originalDispatchEvent) {
      const dispatch = this.originalDispatchEvent;
      const cleanup = this.cleanupCallback;
      this.backdrop.dispatchEvent = (event) => {
        let result;
        let error;
        try {
          result = dispatch(event);
        } catch (err) {
          error = err;
        } finally {
          if (event?.type === "close") {
            cleanup();
          }
        }
        if (error) {
          throw error;
        }
        return result;
      };
    }

    if (this.originalClose) {
      const close = this.originalClose;
      const cleanup = this.cleanupCallback;
      this.modal.close = (...args) => {
        const result = close(...args);
        cleanup();
        return result;
      };
    }

    if (this.originalDestroy) {
      const destroy = this.originalDestroy;
      const cleanup = this.cleanupCallback;
      this.modal.destroy = (...args) => {
        cleanup();
        return destroy(...args);
      };
    }
  }

  /**
   * Restore original lifecycle methods.
   *
   * @pseudocode
   * 1. Restore original dispatchEvent if it was patched.
   */
  restore() {
    if (this.originalDispatchEvent) {
      try {
        this.backdrop.dispatchEvent = this.originalDispatchEvent;
      } catch {}
    }
  }
}

/**
 * Manages header interactions during modal display.
 *
 * @class ModalHeaderManager
 */
class ModalHeaderManager {
  /**
   * Create a header manager.
   *
   * @param {HTMLElement} header - Header element.
   */
  constructor(header) {
    this.header = header;
    this.disabledLinks = [];
  }

  /**
   * Resolve header element and skin class based on page mode.
   *
   * @pseudocode
   * 1. Look for CLI header (#cli-header or .cli-header).
   * 2. Look for classic header (role=banner or <header>).
   * 3. Determine if CLI mode based on header presence.
   * 4. Return header element and appropriate skin class.
   *
   * @returns {{header: HTMLElement|null, skinClass: string}} Header info.
   */
  static resolveHeaderInfo() {
    const cliHeader =
      document.getElementById("cli-header") || document.querySelector(".cli-header");
    const classicHeader =
      document.querySelector('header[role="banner"]') || document.querySelector("header");
    const isCliMode = Boolean(cliHeader);

    return {
      header: (isCliMode ? cliHeader : classicHeader) || null,
      skinClass: isCliMode
        ? ROUND_SELECT_UI.CSS_CLASSES.CLI_MODAL
        : ROUND_SELECT_UI.CSS_CLASSES.CLASSIC_MODAL
    };
  }

  /**
   * Disable all links in header during modal display.
   *
   * @pseudocode
   * 1. Query all <a> elements in header.
   * 2. Set pointerEvents: 'none' on each link.
   * 3. Store references for later restoration.
   */
  disableLinks() {
    if (!this.header) {
      return;
    }

    const links = this.header.querySelectorAll("a");
    this.disabledLinks = Array.from(links);
    this.disabledLinks.forEach((link) => (link.style.pointerEvents = "none"));
  }

  /**
   * Restore link interactivity after modal closes.
   *
   * @pseudocode
   * 1. Iterate through disabled links.
   * 2. Reset pointerEvents to empty string (default).
   */
  restoreLinks() {
    if (this.disabledLinks.length > 0) {
      this.disabledLinks.forEach((link) => (link.style.pointerEvents = ""));
    }
  }
}

/**
 * Manages modal state flags.
 *
 * @class ModalStateManager
 */
class ModalStateManager {
  /**
   * Create a state manager.
   *
   * @param {HTMLElement} backdrop - Modal backdrop element.
   */
  constructor(backdrop) {
    this.backdrop = backdrop;
  }

  /**
   * Mark modal as active or inactive.
   *
   * @pseudocode
   * 1. Set dataset flag for CSS selector targeting.
   * 2. Set internal property flag for JS checks.
   * 3. Clear or set closed flag based on active state.
   *
   * @param {boolean} value - True to mark active, false to mark inactive.
   */
  markActive(value) {
    if (!this.backdrop) {
      return;
    }

    try {
      this.backdrop.dataset[ROUND_SELECT_UI.DATASET_KEY] = value ? "true" : "false";
    } catch {}

    this.backdrop[POSITIONER_PROPS.ACTIVE] = value;

    if (value) {
      try {
        delete this.backdrop[POSITIONER_PROPS.CLOSED];
      } catch {}
    } else {
      this.backdrop[POSITIONER_PROPS.CLOSED] = true;
    }
  }

  /**
   * Check if modal is closed.
   *
   * @returns {boolean} True if modal is marked as closed.
   */
  isClosed() {
    return Boolean(this.backdrop?.[POSITIONER_PROPS.CLOSED]);
  }

  /**
   * Check if modal is active.
   *
   * @returns {boolean} True if modal positioning is active.
   */
  isActive() {
    return Boolean(
      this.backdrop?.[POSITIONER_PROPS.ACTIVE] &&
        this.backdrop.dataset?.[ROUND_SELECT_UI.DATASET_KEY] === "true"
    );
  }
}

/**
 * Coordinator class that manages all positioning aspects.
 * Facade pattern to simplify external usage.
 *
 * @class RoundSelectPositioner
 */
export class RoundSelectPositioner {
  /**
   * Create a round select positioner.
   *
   * @param {object} modal - Modal instance.
   */
  constructor(modal) {
    this.modal = modal;
    this.backdrop = modal?.element ?? null;

    // Sub-managers (created during apply())
    this.stateManager = null;
    this.positioner = null;
    this.lifecycleManager = null;
    this.headerManager = null;

    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Apply all positioning logic to the modal.
   *
   * @pseudocode
   * 1. Check if backdrop exists and is not closed.
   * 2. Resolve header info and create managers.
   * 3. Apply skin class to backdrop.
   * 4. Capture and patch lifecycle methods.
   * 5. Mark modal as active and update positioning.
   * 6. Attach event listeners.
   * 7. Disable header links.
   */
  apply() {
    if (!this.backdrop) {
      return;
    }

    this.stateManager = new ModalStateManager(this.backdrop);

    if (this.stateManager.isClosed()) {
      return;
    }

    const { header, skinClass } = ModalHeaderManager.resolveHeaderInfo();

    if (!header) {
      return;
    }

    // Apply skin class
    this.applySkinClass(skinClass);

    // Create managers
    this.headerManager = new ModalHeaderManager(header);
    this.positioner = new ModalPositioner(this.backdrop, header);
    this.lifecycleManager = new ModalLifecycleManager(this.modal, this.backdrop, this.cleanup);

    // Setup
    this.lifecycleManager.captureOriginalMethods();
    this.lifecycleManager.patchMethods();

    // Activate
    this.stateManager.markActive(true);
    this.positioner.activate();
    this.positioner.attachListeners();

    // Listen for close event
    try {
      this.backdrop.addEventListener("close", this.cleanup);
    } catch {}

    // Disable header navigation
    this.headerManager.disableLinks();
  }

  /**
   * Apply skin class to backdrop.
   *
   * @param {string} className - CSS class to add.
   */
  applySkinClass(className) {
    if (!this.backdrop || !className) {
      return;
    }
    try {
      this.backdrop.classList.add(className);
    } catch {}
  }

  /**
   * Clean up all managers and restore original state.
   *
   * @pseudocode
   * 1. Check if already cleaned up (closed flag set).
   * 2. Clean up positioner (remove listeners).
   * 3. Remove close event listener from backdrop.
   * 4. Restore lifecycle methods.
   * 5. Restore header links.
   * 6. Mark modal as inactive.
   */
  cleanup() {
    if (!this.backdrop || !this.stateManager || this.stateManager.isClosed()) {
      return;
    }

    // Cleanup positioner
    if (this.positioner) {
      this.positioner.cleanup();
    }

    // Remove close listener
    try {
      this.backdrop.removeEventListener("close", this.cleanup);
    } catch {}

    // Restore lifecycle
    if (this.lifecycleManager) {
      this.lifecycleManager.restore();
    }

    // Restore header links
    if (this.headerManager) {
      this.headerManager.restoreLinks();
    }

    // Mark inactive
    this.stateManager.markActive(false);
  }
}
