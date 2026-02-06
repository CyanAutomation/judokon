import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { getPointsToWin, setPointsToWin } from "../BattleEngine.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { wrap } from "../storage.js";
import { POINTS_TO_WIN_OPTIONS, DEFAULT_POINTS_TO_WIN } from "../../config/battleDefaults.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { ROUND_SELECT_UI } from "../../config/roundSelectConstants.js";
import { logEvent } from "../telemetry.js";
import { t } from "../i18n.js";
import rounds from "../../data/battleRounds.js";
import { syncWinTargetDropdown } from "./winTargetSync.js";
import snackbarManager, { SnackbarPriority } from "../SnackbarManager.js";
import { RoundSelectPositioner } from "./modalPositioning.js";

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
 * Persist round selection to storage.
 *
 * @pseudocode
 * 1. Try to persist the value to storage using storage.set().
 * 2. Catch and ignore storage errors.
 *
 * @param {object} storage - Storage wrapper instance with set() method.
 * @param {number} value - Points needed to win the round.
 */
function persistRoundSelection(storage, value) {
  try {
    storage.set(value);
  } catch {}
}

/**
 * Log match start telemetry.
 *
 * @pseudocode
 * 1. Define the log payload with pointsToWin and source.
 * 2. If nonBlocking is true, queue the log call asynchronously.
 * 3. Otherwise call logEvent immediately.
 * 4. Swallow errors so telemetry never blocks gameplay.
 *
 * @param {{pointsToWin: number, source: string, nonBlocking?: boolean}} params
 */
function logMatchStartTelemetry({ pointsToWin, source, nonBlocking = false }) {
  const payload = { pointsToWin, source };
  const logTelemetry = () => {
    try {
      logEvent("battle.start", payload);
    } catch {}
  };

  const safelyLogTelemetry = () => {
    try {
      logTelemetry();
    } catch {}
  };

  if (nonBlocking) {
    try {
      queueMicrotask(safelyLogTelemetry);
    } catch {
      setTimeout(safelyLogTelemetry, 0);
    }
    return;
  }

  safelyLogTelemetry();
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
 * @param {number} pointsToWin - Points needed to win.
 * @param {string} source - Source identifier for telemetry and logging.
 * @param {Function} onStart - Callback invoked after setup.
 * @param {boolean} emitEvents - Whether to emit DOM events.
 * @returns {Promise<void>}
 */
async function startMatch({ pointsToWin, source, onStart, emitEvents }) {
  setPointsToWin(pointsToWin);
  try {
    document.body.dataset.target = String(pointsToWin);
  } catch {}
  // Sync the settings dropdown to reflect the new win target
  try {
    syncWinTargetDropdown();
  } catch {}
  try {
    // Use LOW priority so this doesn't override opponent/countdown messages
    snackbarManager.show({
      text: ROUND_SELECT_UI.MESSAGES.winTarget(pointsToWin),
      priority: SnackbarPriority.LOW,
      minDuration: 2000,
      ttl: 3000
    });
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
        context: "roundSelectModal",
        source
      });
    }
  } catch (err) {
    logEvent("battle.error", {
      type: "startFailed",
      error: err.message,
      stack: err.stack,
      context: "roundSelectModal",
      source
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
/**
 * Resolve the win target using the fallback chain.
 *
 * @pseudocode
 * 1. Try to get engine target from getPointsToWin() and validate it's finite and positive.
 * 2. If engine target is invalid, try to load persisted selection from storage.
 * 3. If no persisted selection, return DEFAULT_POINTS_TO_WIN as final fallback.
 *
 * @param {{autostart: boolean, storage: {get: Function}}} params
 * @returns {{pointsToWin: number, source: string}} The resolved win target value and source.
 */
function resolvePointsToWin({ autostart, storage }) {
  try {
    const engineTarget = Number(getPointsToWin());
    if (Number.isFinite(engineTarget) && engineTarget > 0) {
      return { pointsToWin: engineTarget, source: "engine" };
    }
  } catch {}

  const persistedTarget = loadPersistedSelection(storage);
  if (persistedTarget !== null) {
    return { pointsToWin: persistedTarget, source: autostart ? "autostart" : "storage" };
  }

  return { pointsToWin: DEFAULT_POINTS_TO_WIN, source: autostart ? "autostart" : "default" };
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
function loadPersistedSelection(storage) {
  try {
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
 * @param {{modal: object, container: HTMLElement, cleanupRegistry: object, onSelect: Function, defaultValue: number}} params
 * @returns {{buttons: HTMLElement[], defaultButton: HTMLElement|null}} Buttons array and default selection.
 */
function wireRoundSelectionButtons({ modal, container, cleanupRegistry, onSelect, defaultValue }) {
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
        onSelect,
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
 * 2. Call initTooltips(modalElement, modalElement) which returns a Promise.
 * 3. When resolved, capture cleanup function from promise result.
 * 4. Log error if tooltip initialization fails.
 * 5. Return cleanup function wrapper and ready promise.
 *
 * @param {HTMLElement} modalElement - Modal element to initialize tooltips for.
 * @returns {{cleanup: Function, ready: Promise}} Cleanup function and ready promise.
 */
function setupTooltipLifecycle(modalElement) {
  let cleanupFn = () => {};

  const ready = initTooltips(modalElement, modalElement)
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
 * 1. Close the modal.
 * 2. Call tooltip cleanup function from registry.
 * 3. Call keyboard cleanup function from registry.
 * 4. Destroy modal instance.
 * 5. Invoke the provided onSelect callback to start the match.
 *
 * @param {{value: number, modal: object, cleanupRegistry: object, onSelect: Function, emitEvents: boolean}} params
 * @returns {Promise<void>}
 */
async function handleRoundSelect({ value, modal, cleanupRegistry, onSelect, emitEvents }) {
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
  await onSelect({ pointsToWin: value, emitEvents });
}

/**
 * Create and display the round selection modal UI.
 *
 * @pseudocode
 * 1. Build modal structure and apply positioning.
 * 2. Wire buttons to onSelect callback.
 * 3. Setup keyboard navigation and tooltips.
 * 4. Open modal and emit readiness event.
 *
 * @param {{onSelect: Function, defaultValue: number|null}} params
 * @returns {{modal: object, cleanupRegistry: object, buttons: HTMLElement[], defaultButton: HTMLElement|null}}
 */
function loadRoundSelectModal({ onSelect, defaultValue }) {
  const { modal, buttonContainer } = createRoundSelectModal();

  const positioner = new RoundSelectPositioner(modal);
  positioner.apply();

  const cleanupRegistry = createCleanupRegistry();
  const { buttons, defaultButton } = wireRoundSelectionButtons({
    modal,
    container: buttonContainer,
    cleanupRegistry,
    onSelect,
    defaultValue
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

  return {
    modal,
    cleanupRegistry,
    buttons,
    defaultButton
  };
}

/**
 * Resolve round start policy for Classic Battle.
 *
 * @pseudocode
 * 1. Resolve environment flags and autostart/test bypass.
 * 2. If autostart/test bypass is active, resolve points and start match.
 * 3. Otherwise show the round selection modal UI.
 *
 * @param {Function} onStart - Callback to invoke after selecting rounds.
 * @returns {Promise<void>} Resolves when modal is initialized.
 */
export async function resolveRoundStartPolicy(onStart) {
  const environment = resolveEnvironmentFlags();
  const storage = wrap(BATTLE_POINTS_TO_WIN);

  const autoStartRequested = shouldAutostart();
  const bypassForTests =
    !environment.showModalInTest && (isTestModeEnabled() || environment.isPlaywright);

  if (autoStartRequested || bypassForTests) {
    const { pointsToWin, source } = resolvePointsToWin({
      autostart: true,
      storage
    });
    await startMatch({
      pointsToWin,
      source,
      onStart,
      emitEvents: environment.emitEvents
    });
    return;
  }

  const persistedSelection = loadPersistedSelection(storage);

  const onSelect = async ({ pointsToWin, emitEvents }) => {
    persistRoundSelection(storage, pointsToWin);
    logMatchStartTelemetry({ pointsToWin, source: "modal", nonBlocking: true });
    await startMatch({
      pointsToWin,
      source: "modal",
      onStart,
      emitEvents
    });
  };

  loadRoundSelectModal({
    onSelect,
    defaultValue: persistedSelection
  });
}
