/**
 * Constants for round selection modal UI and behavior.
 *
 * @module roundSelectConstants
 */

/**
 * UI text and configuration for round selection modal.
 *
 * @constant
 * @type {object}
 */
export const ROUND_SELECT_UI = {
  /** Instructions text shown in modal */
  INSTRUCTIONS_TEXT: "Use number keys (1-3) or arrow keys to select",

  /** I18n key for modal title */
  TITLE_I18N_KEY: "modal.roundSelect.title",

  /** Prefix for tooltip IDs on round buttons */
  TOOLTIP_PREFIX: "ui.round",

  /** Dataset key for modal active state */
  DATASET_KEY: "roundSelectModalActive",

  /** CSS class names */
  CSS_CLASSES: {
    CLI_MODAL: "cli-modal",
    CLASSIC_MODAL: "classic-modal",
    HEADER_AWARE: "header-aware",
    BUTTON_CONTAINER: "round-select-buttons",
    INSTRUCTIONS: "round-select-instructions"
  },

  /** User-facing messages */
  MESSAGES: {
    /**
     * Generate win target snackbar message.
     *
     * @param {number} points - Points needed to win.
     * @returns {string} Formatted message.
     */
    winTarget: (points) => `First to ${points} points wins.`
  }
};

/**
 * Property names used for internal state tracking.
 *
 * @constant
 * @type {object}
 */
export const POSITIONER_PROPS = {
  /** Flag indicating positioning is active */
  ACTIVE: "__roundSelectPositioningActive",

  /** Flag indicating modal has been closed */
  CLOSED: "__roundSelectPositioningClosed"
};
