import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { getPointsToWin, setPointsToWin } from "../battleEngineFacade.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { wrap } from "../storage.js";
import { POINTS_TO_WIN_OPTIONS, DEFAULT_POINTS_TO_WIN } from "../../config/battleDefaults.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { ROUND_SELECT_UI, POSITIONER_PROPS } from "../../config/roundSelectConstants.js";
import { rafDebounce } from "../../utils/rafUtils.js";
import { logEvent } from "../telemetry.js";
import { t } from "../i18n.js";
import rounds from "../../data/battleRounds.js";
import { syncWinTargetDropdown } from "./winTargetSync.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Check if the URL requests an automatic start.
 *
 * @pseudocode
 * 1. Parse `location.search` for `autostart=1` inside a try/catch.
 * 2. Return `true` when present; otherwise `false`.
 *
 * @returns {boolean} True when `?autostart=1` is present.
 */
export function shouldAutostart() {
  try {
    if (typeof location !== "undefined") {
      const params = new URLSearchParams(location.search);
      return params.get("autostart") === "1";
    }
  } catch {}
  return false;
}

/**
 * Persist round selection and log the event.
 *
 * @pseudocode
 * 1. Try to persist the value to storage using wrap(BATTLE_POINTS_TO_WIN).set().
 * 2. Catch and ignore storage errors.
 * 3. Try to log 'battle.start' event with pointsToWin and source='modal'.
 * 4. Catch and ignore logging errors.
 *
 * @param {number} value - Points needed to win the round.
 */
function persistRoundAndLog(value) {
  try {
    wrap(BATTLE_POINTS_TO_WIN).set(value);
  } catch {}
  try {
    logEvent("battle.start", { pointsToWin: value, source: "modal" });
  } catch {}
}

/**
 * Start a battle round with the specified win target.
 *
 * @pseudocode
 * 1. Set win target in battle engine via setPointsToWin().
 * 2. Update DOM dataset.target with the value.
 * 3. Sync settings dropdown to reflect new target.
 * 4. Show snackbar confirmation message.
 * 5. Call onStart callback if provided.
 * 6. Emit battleStateChange DOM event if emitEvents=true.
 * 7. Always dispatch startClicked to state machine.
 * 8. Log error if dispatch fails.
 *
 * @param {number} value - Points needed to win.
 * @param {Function} onStart - Callback invoked after setup.
 * @param {boolean} emitEvents - Whether to emit DOM events.
 * @returns {Promise<void>}
 */
async function startRound(value, onStart, emitEvents) {
  setPointsToWin(value);
  try {
    document.body.dataset.target = String(value);
  } catch {}
  // Sync the settings dropdown to reflect the new win target
  try {
    syncWinTargetDropdown();
  } catch {}
  try {
    showSnackbar(ROUND_SELECT_UI.MESSAGES.winTarget(value));
  } catch {}
  try {
    if (typeof onStart === "function") {
      await onStart();
    }
    if (emitEvents) {
      emitBattleEvent("startClicked");
    }
    // Always dispatch to state machine, regardless of emitEvents flag
    // emitEvents controls DOM event emission but not state machine transitions
    const dispatched = await dispatchBattleEvent("startClicked");
    if (!dispatched) {
      logEvent("battle.error", {
        type: "dispatchFailed",
        event: "startClicked",
        context: "roundSelectModal"
      });
    }
  } catch (err) {
    logEvent("battle.error", {
      type: "startFailed",
      error: err.message,
      stack: err.stack,
      context: "roundSelectModal"
    });
  }
}

/**
 * Detect test/automation environment and feature flags.
 *
 * @pseudocode
 * 1. Check if running in Vitest (process.env.VITEST === 'true').
 * 2. Check if running in Playwright (navigator.userAgent contains 'Headless' or webdriver=true).
 * 3. Check for feature flag override window.__FF_OVERRIDES?.showRoundSelectModal.
 * 4. Return environment flags: isVitest, isPlaywright, showModalInTest, emitEvents.
 *
 * @returns {{isVitest: boolean, isPlaywright: boolean, showModalInTest: boolean, emitEvents: boolean}}
 */
function resolveEnvironmentFlags() {
  const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST === "true";
  const isPlaywright =
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("Headless") || navigator.webdriver === true);

  let showModalInTest = false;
  if (typeof window !== "undefined") {
    try {
      showModalInTest = Boolean(window.__FF_OVERRIDES?.showRoundSelectModal);
    } catch {}
  }

  return {
    isVitest,
    isPlaywright,
    showModalInTest,
    emitEvents: !isVitest
  };
}

/**
 * Handle automatic start for URLs with ?autostart=1 or test mode bypass.
 *
 * @pseudocode
 * 1. Check if URL contains autostart=1 parameter.
 * 2. Check if test mode is enabled (isTestModeEnabled or isPlaywright).
 * 3. If autostart requested OR (test mode AND not showModalInTest), start immediately.
 * 4. Resolve win target from fallback chain and call startRound().
 * 5. Return true if started, false otherwise.
 *
 * @param {Function} onStart - Callback to invoke after start.
 * @param {{emitEvents: boolean, isPlaywright: boolean, showModalInTest: boolean}} env - Environment flags.
 * @returns {Promise<boolean>} True if auto-started, false if modal should be shown.
 */
async function handleAutostartAndTestMode(onStart, { emitEvents, isPlaywright, showModalInTest }) {
  const autoStartRequested = shouldAutostart();
  const bypassForTests = !showModalInTest && (isTestModeEnabled() || isPlaywright);

  if (autoStartRequested || bypassForTests) {
    const resolvedTarget = resolveWinTarget();
    await startRound(resolvedTarget, onStart, emitEvents);
    return true;
  }

  return false;
}

/**
 * Resolve the win target using the fallback chain.
 *
 * @pseudocode
 * 1. Try to get engine target from getPointsToWin() and validate it's finite and positive.
 * 2. If engine target is invalid, try to load persisted selection from storage.
 * 3. If no persisted selection, return DEFAULT_POINTS_TO_WIN as final fallback.
 *
 * @returns {number} The resolved win target value.
 */
function resolveWinTarget() {
  try {
    const engineTarget = Number(getPointsToWin());
    if (Number.isFinite(engineTarget) && engineTarget > 0) {
      return engineTarget;
    }
  } catch {}

  const persistedTarget = loadPersistedSelection();
  if (persistedTarget !== null) {
    return persistedTarget;
  }

  return DEFAULT_POINTS_TO_WIN;
}

/**
 * Load persisted round selection from storage.
 *
 * @pseudocode
 * 1. Try to load saved value from storage using wrap(BATTLE_POINTS_TO_WIN).get().
 * 2. Convert to number and validate it's in POINTS_TO_WIN_OPTIONS.
 * 3. Return the numeric value if valid.
 * 4. Return null if storage fails or value is invalid.
 *
 * @returns {number|null} The persisted value or null if not found/invalid.
 */
function loadPersistedSelection() {
  try {
    const storage = wrap(BATTLE_POINTS_TO_WIN);
    const saved = storage.get();
    const numeric = Number(saved);
    if (POINTS_TO_WIN_OPTIONS.includes(numeric)) {
      return numeric;
    }
  } catch {}

  return null;
}

/**
 * Create the round selection modal DOM structure.
 *
 * @pseudocode
 * 1. Create h2 title element with i18n text from t('modal.roundSelect.title').
 * 2. Create div container for buttons with class 'round-select-buttons'.
 * 3. Create p element with keyboard instructions.
 * 4. Append all to DocumentFragment.
 * 5. Create modal using createModal() with fragment and labelledBy title.
 * 6. Return modal instance and buttonContainer reference.
 *
 * @returns {{modal: object, buttonContainer: HTMLElement}} Modal instance and button container.
 */
function createRoundSelectModal() {
  const title = document.createElement("h2");
  title.id = "round-select-title";
  title.textContent = t(ROUND_SELECT_UI.TITLE_I18N_KEY);

  const btnWrap = document.createElement("div");
  btnWrap.className = ROUND_SELECT_UI.CSS_CLASSES.BUTTON_CONTAINER;

  const instructions = document.createElement("p");
  instructions.className = ROUND_SELECT_UI.CSS_CLASSES.INSTRUCTIONS;
  instructions.textContent = ROUND_SELECT_UI.INSTRUCTIONS_TEXT;

  const frag = document.createDocumentFragment();
  frag.append(title, instructions, btnWrap);

  const modal = createModal(frag, { labelledBy: title });

  return { modal, buttonContainer: btnWrap };
}

/**
 * Create cleanup registry for managing lifecycle teardown.
 *
 * @pseudocode
 * 1. Create object with tooltips and keyboard properties.
 * 2. Initialize both as no-op functions.
 * 3. Actual cleanup functions will be assigned during setup.
 * 4. Return registry object.
 *
 * @returns {{tooltips: Function, keyboard: Function}} Cleanup function registry.
 */
function createCleanupRegistry() {
  return {
    tooltips: () => {},
    keyboard: () => {}
  };
}

/**
 * Create and wire round selection buttons with click handlers.
 *
 * @pseudocode
 * 1. Iterate through rounds array from battleRounds.js.
 * 2. For each round, create button with label and tooltip.
 * 3. Add click handler that sets aria-pressed, clears others, calls handleRoundSelect.
 * 4. Append button to container and add to buttons array.
 * 5. Track defaultButton if round.value matches defaultValue.
 * 6. Return buttons array and defaultButton reference.
 *
 * @param {{modal: object, container: HTMLElement, cleanupRegistry: object, onStart: Function, defaultValue: number}} params
 * @returns {{buttons: HTMLElement[], defaultButton: HTMLElement|null}} Buttons array and default selection.
 */
function wireRoundSelectionButtons({ modal, container, cleanupRegistry, onStart, defaultValue }) {
  const buttons = [];
  let defaultButton = null;

  rounds.forEach((round) => {
    const button = createButton(round.label, { id: `round-select-${round.id}` });
    button.dataset.tooltipId = `${ROUND_SELECT_UI.TOOLTIP_PREFIX}${round.label}`;
    button.addEventListener("click", () => {
      for (const other of buttons) {
        if (other === button) {
          other.setAttribute("aria-pressed", "true");
          delete other.dataset.defaultSelection;
        } else {
          other.removeAttribute("aria-pressed");
          delete other.dataset.defaultSelection;
        }
      }
      handleRoundSelect({
        value: round.value,
        modal,
        cleanupRegistry,
        onStart,
        emitEvents: true
      });
    });
    container.appendChild(button);
    buttons.push(button);

    if (Number(defaultValue) === Number(round.value)) {
      defaultButton = button;
    }
  });

  return { buttons, defaultButton };
}

/**
 * Handle number key press (1, 2, 3) for direct round selection.
 *
 * @param {KeyboardEvent} event - The keyboard event.
 * @param {HTMLElement[]} buttons - Array of round selection buttons.
 * @param {number} index - Button index to click.
 */
function handleNumberKey(event, buttons, index) {
  event.preventDefault();
  buttons[index]?.click();
}

/**
 * Handle arrow key navigation (up/down) through buttons.
 *
 * @param {KeyboardEvent} event - The keyboard event.
 * @param {HTMLElement[]} buttons - Array of round selection buttons.
 * @param {number} direction - Direction to move (-1 for up, 1 for down).
 */
function handleArrowNavigation(event, buttons, direction) {
  event.preventDefault();
  const currentIndex = buttons.indexOf(document.activeElement);
  let nextIndex;

  if (direction === -1) {
    // ArrowUp: Move to previous button, wrap to last
    nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
  } else {
    // ArrowDown: Move to next button, wrap to first
    nextIndex = currentIndex >= 0 && currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
  }

  buttons[nextIndex]?.focus();
}

/**
 * Handle Enter key activation of focused button.
 *
 * @param {KeyboardEvent} event - The keyboard event.
 * @param {HTMLElement[]} buttons - Array of round selection buttons.
 */
function handleEnterKey(event, buttons) {
  event.preventDefault();
  const currentFocus = document.activeElement;
  if (currentFocus && buttons.includes(currentFocus)) {
    currentFocus.click();
  }
}

function setupKeyboardNavigation(modalElement, buttons) {
  const handleKeyDown = (event) => {
    const keyHandlers = {
      1: () => handleNumberKey(event, buttons, 0),
      2: () => handleNumberKey(event, buttons, 1),
      3: () => handleNumberKey(event, buttons, 2),
      ArrowUp: () => handleArrowNavigation(event, buttons, -1),
      ArrowDown: () => handleArrowNavigation(event, buttons, 1),
      Enter: () => handleEnterKey(event, buttons)
    };

    const handler = keyHandlers[event.key];
    if (handler) {
      handler();
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Initialize tooltip lifecycle for modal elements.
 *
 * @pseudocode
 * 1. Create cleanup function placeholder.
 * 2. Call initTooltips(modalElement) which returns a Promise.
 * 3. When resolved, capture cleanup function from promise result.
 * 4. Log error if tooltip initialization fails.
 * 5. Return cleanup function wrapper and ready promise.
 *
 * @param {HTMLElement} modalElement - Modal element to initialize tooltips for.
 * @returns {{cleanup: Function, ready: Promise}} Cleanup function and ready promise.
 */
function setupTooltipLifecycle(modalElement) {
  let cleanupFn = () => {};

  const ready = initTooltips(modalElement)
    .then((fn) => {
      if (typeof fn === "function") {
        cleanupFn = fn;
      }
    })
    .catch((err) => {
      logEvent("tooltip.error", {
        type: "initializationFailed",
        error: err.message,
        context: "roundSelectModal"
      });
    });

  return {
    cleanup: () => {
      try {
        cleanupFn();
      } catch {}
    },
    ready
  };
}

/**
 * Handle round selection and start the battle.
 *
 * @pseudocode
 * 1. Persist the selected value to storage and log event.
 * 2. Close the modal.
 * 3. Call tooltip cleanup function from registry.
 * 4. Call keyboard cleanup function from registry.
 * 5. Destroy modal instance.
 * 6. Call startRound with value, onStart callback, and emitEvents flag.
 *
 * @param {{value: number, modal: object, cleanupRegistry: object, onStart: Function, emitEvents: boolean}} params
 * @returns {Promise<void>}
 */
async function handleRoundSelect({ value, modal, cleanupRegistry, onStart, emitEvents }) {
  persistRoundAndLog(value);
  modal.close();
  try {
    cleanupRegistry.tooltips();
  } catch {}
  try {
    cleanupRegistry.keyboard();
  } catch {}
  try {
    modal.destroy();
  } catch {}
  await startRound(value, onStart, emitEvents);
}

class RoundSelectPositioner {
  constructor(modal) {
    this.modal = modal;
    this.backdrop = modal?.element ?? null;
    this.datasetKey = ROUND_SELECT_UI.DATASET_KEY;
    this.activeProp = POSITIONER_PROPS.ACTIVE;
    this.closedProp = POSITIONER_PROPS.CLOSED;
    this.isActive = false;
    this.headerRef = null;
    this.originalClose = null;
    this.originalDestroy = null;
    this.originalDispatchEvent = null;
    this.onResize = null;
    this.raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
    this.caf =
      typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (id) => clearTimeout(id);

    this.cleanup = this.cleanup.bind(this);
  }

  apply() {
    if (!this.backdrop || this.backdrop[this.closedProp]) {
      return;
    }

    this.captureOriginalLifecycle();

    const { header, skinClass } = this.resolveHeaderInfo();
    this.applySkinClass(skinClass);
    this.headerRef = header;

    if (!this.headerRef) {
      return;
    }

    this.markActive(true);
    this.isActive = true;
    this.updateInset();
    this.attachListeners();
    this.disableHeaderLinks();
    this.patchLifecycle();
  }

  markActive(value) {
    if (!this.backdrop) {
      return;
    }
    try {
      this.backdrop.dataset[this.datasetKey] = value ? "true" : "false";
    } catch {}
    this.backdrop[this.activeProp] = value;
    if (value) {
      try {
        delete this.backdrop[this.closedProp];
      } catch {}
    } else {
      this.backdrop[this.closedProp] = true;
    }
  }

  captureOriginalLifecycle() {
    this.originalClose =
      typeof this.modal?.close === "function" ? this.modal.close.bind(this.modal) : null;
    this.originalDestroy =
      typeof this.modal?.destroy === "function" ? this.modal.destroy.bind(this.modal) : null;
    this.originalDispatchEvent =
      typeof this.backdrop?.dispatchEvent === "function"
        ? this.backdrop.dispatchEvent.bind(this.backdrop)
        : null;
  }

  resolveHeaderInfo() {
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

  applySkinClass(className) {
    if (!this.backdrop || !className) {
      return;
    }
    try {
      this.backdrop.classList.add(className);
    } catch {}
  }

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

    try {
      this.backdrop.addEventListener("close", this.cleanup);
    } catch {}
  }

  updateInset() {
    if (!this.isActive) {
      return;
    }
    if (!this.backdrop?.[this.activeProp]) {
      return;
    }
    if (this.backdrop.dataset?.[this.datasetKey] !== "true") {
      return;
    }
    try {
      const height = this.headerRef?.offsetHeight;
      if (Number.isFinite(height) && height >= 0) {
        this.backdrop.style.setProperty("--modal-inset-top", `${height}px`);
        this.backdrop.classList.add(ROUND_SELECT_UI.CSS_CLASSES.HEADER_AWARE);
      }
    } catch {}
  }

  patchLifecycle() {
    if (this.originalDispatchEvent) {
      const dispatch = this.originalDispatchEvent;
      this.backdrop.dispatchEvent = (event) => {
        let result;
        let error;
        try {
          result = dispatch(event);
        } catch (err) {
          error = err;
        } finally {
          if (event?.type === "close") {
            this.cleanup();
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
      this.modal.close = (...args) => {
        const result = close(...args);
        this.cleanup();
        return result;
      };
    }

    if (this.originalDestroy) {
      const destroy = this.originalDestroy;
      this.modal.destroy = (...args) => {
        this.cleanup();
        return destroy(...args);
      };
    }
  }

  disableHeaderLinks() {
    if (this.headerRef) {
      const links = this.headerRef.querySelectorAll("a");
      this.disabledLinks = Array.from(links);
      this.disabledLinks.forEach((link) => (link.style.pointerEvents = "none"));
    }
  }

  cleanup() {
    if (!this.backdrop || this.backdrop[this.closedProp]) {
      return;
    }

    this.isActive = false;
    if (this.onResize) {
      try {
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("orientationchange", this.onResize);
      } catch {}
    }

    try {
      this.backdrop.removeEventListener("close", this.cleanup);
    } catch {}

    if (this.originalDispatchEvent) {
      try {
        this.backdrop.dispatchEvent = this.originalDispatchEvent;
      } catch {}
    }

    if (this.disabledLinks) {
      this.disabledLinks.forEach((link) => (link.style.pointerEvents = ""));
    }

    this.headerRef = null;
    this.markActive(false);
  }
}

/**
 * Initialize round selection modal for Classic Battle.
 *
 * @pseudocode
 * 1. Autostart or test mode → start default round.
 * 2. If a persisted round exists → start and skip modal.
 * 3. Build modal with buttons for each round in `rounds`.
 * 4. Initialize tooltips, open modal, emit readiness event.
 *
 * @param {Function} onStart - Callback to invoke after selecting rounds.
 * @returns {Promise<void>} Resolves when modal is initialized.
 */
export async function initRoundSelectModal(onStart) {
  const environment = resolveEnvironmentFlags();

  if (await handleAutostartAndTestMode(onStart, environment)) {
    return;
  }

  const persistedSelection = loadPersistedSelection();

  const { modal, buttonContainer } = createRoundSelectModal();

  const positioner = new RoundSelectPositioner(modal);
  positioner.apply();

  const cleanupRegistry = createCleanupRegistry();
  const { buttons, defaultButton } = wireRoundSelectionButtons({
    modal,
    container: buttonContainer,
    cleanupRegistry,
    onStart,
    defaultValue: persistedSelection
  });

  const modalElement = modal.element;
  document.body.appendChild(modalElement);

  cleanupRegistry.keyboard = setupKeyboardNavigation(modal.dialog, buttons);

  const tooltipLifecycle = setupTooltipLifecycle(modalElement);
  cleanupRegistry.tooltips = tooltipLifecycle.cleanup;

  modal.open();
  try {
    if (defaultButton instanceof HTMLElement) {
      defaultButton.dataset.defaultSelection = "true";
      defaultButton.setAttribute("aria-pressed", "true");
      defaultButton.focus();
    } else if (buttons.length > 0) {
      buttons[0].focus();
    }
  } catch {}

  emitBattleEvent("roundOptionsReady");

  await Promise.resolve();
}
