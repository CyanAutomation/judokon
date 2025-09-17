import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { setPointsToWin } from "../battleEngineFacade.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { wrap } from "../storage.js";
import { POINTS_TO_WIN_OPTIONS, DEFAULT_POINTS_TO_WIN } from "../../config/battleDefaults.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { logEvent } from "../telemetry.js";
import { t } from "../i18n.js";
import rounds from "../../data/battleRounds.js";
import { syncWinTargetDropdown } from "../../pages/battleCLI/init.js";

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
    if (typeof onStart === "function") {
      await onStart();
    }
    if (emitEvents) {
      emitBattleEvent("startClicked");
      const dispatched = await dispatchBattleEvent("startClicked");
      if (!dispatched) {
        console.warn("Modal: dispatchBattleEvent failed for startClicked");
      }
    }
  } catch (err) {
    console.error("Failed to start battle:", err);
  }
}

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

async function handleAutostartAndTestMode(onStart, { emitEvents, isPlaywright, showModalInTest }) {
  const autoStartRequested = shouldAutostart();
  const bypassForTests = !showModalInTest && (isTestModeEnabled() || isPlaywright);

  if (autoStartRequested || bypassForTests) {
    await startRound(DEFAULT_POINTS_TO_WIN, onStart, emitEvents);
    return true;
  }

  return false;
}

async function handlePersistedSelection(onStart, emitEvents) {
  try {
    const storage = wrap(BATTLE_POINTS_TO_WIN);
    const saved = storage.get();
    const numeric = Number(saved);
    if (POINTS_TO_WIN_OPTIONS.includes(numeric)) {
      try {
        logEvent("battle.start", { pointsToWin: numeric, source: "storage" });
      } catch {}
      await startRound(numeric, onStart, emitEvents);
      return true;
    }
  } catch {}

  return false;
}

function createRoundSelectModal() {
  const title = document.createElement("h2");
  title.id = "round-select-title";
  title.textContent = t("modal.roundSelect.title");

  const btnWrap = document.createElement("div");
  btnWrap.className = "round-select-buttons";

  const instructions = document.createElement("p");
  instructions.className = "round-select-instructions";
  instructions.textContent = "Use number keys (1-3) or arrow keys to select";

  const frag = document.createDocumentFragment();
  frag.append(title, instructions, btnWrap);

  const modal = createModal(frag, { labelledBy: title });

  return { modal, buttonContainer: btnWrap };
}

function createCleanupRegistry() {
  return {
    tooltips: () => {},
    keyboard: () => {}
  };
}

function wireRoundSelectionButtons({ modal, container, cleanupRegistry, onStart }) {
  const buttons = [];

  rounds.forEach((round) => {
    const button = createButton(round.label, { id: `round-select-${round.id}` });
    button.dataset.tooltipId = `ui.round${round.label}`;
    button.addEventListener("click", () => {
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
  });

  return buttons;
}

function setupKeyboardNavigation(modalElement, buttons) {
  const handleKeyDown = (event) => {
    const currentFocus = document.activeElement;
    const currentIndex = buttons.indexOf(currentFocus);

    switch (event.key) {
      case "1":
        event.preventDefault();
        buttons[0]?.click();
        break;
      case "2":
        event.preventDefault();
        buttons[1]?.click();
        break;
      case "3":
        event.preventDefault();
        buttons[2]?.click();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (currentIndex > 0) {
          buttons[currentIndex - 1].focus();
        } else {
          buttons[buttons.length - 1]?.focus();
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < buttons.length - 1) {
          buttons[currentIndex + 1].focus();
        } else {
          buttons[0]?.focus();
        }
        break;
      case "Enter":
        event.preventDefault();
        if (currentFocus && buttons.includes(currentFocus)) {
          currentFocus.click();
        }
        break;
      default:
        break;
    }
  };

  modalElement.addEventListener("keydown", handleKeyDown);

  return () => {
    modalElement.removeEventListener("keydown", handleKeyDown);
  };
}

function setupTooltipLifecycle(modalElement) {
  let cleanupFn = () => {};

  const ready = initTooltips(modalElement)
    .then((fn) => {
      if (typeof fn === "function") {
        cleanupFn = fn;
      }
    })
    .catch((err) => {
      console.error("Failed to initialize tooltips:", err);
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

async function handleRoundSelect({ value, modal, cleanupRegistry, onStart, emitEvents }) {
  persistRoundAndLog(value);
  modal.close();
  try {
    modal.element.dispatchEvent(new Event("close"));
  } catch {}
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
    this.datasetKey = "roundSelectModalActive";
    this.activeProp = "__roundSelectPositioningActive";
    this.closedProp = "__roundSelectPositioningClosed";
    this.isActive = false;
    this.headerRef = null;
    this.resizeId = null;
    this.originalClose = null;
    this.originalDestroy = null;
    this.originalDispatchEvent = null;
    this.onResize = null;
    this.raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
    this.caf =
      typeof cancelAnimationFrame === "function"
        ? cancelAnimationFrame
        : (id) => clearTimeout(id);

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
    const cliHeader = document.getElementById("cli-header") || document.querySelector(".cli-header");
    const classicHeader =
      document.querySelector('header[role="banner"]') || document.querySelector("header");
    const isCliMode = Boolean(cliHeader);

    return {
      header: (isCliMode ? cliHeader : classicHeader) || null,
      skinClass: isCliMode ? "cli-modal" : "classic-modal"
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
    this.onResize = () => {
      if (!this.isActive) {
        return;
      }
      if (this.resizeId !== null) {
        try {
          this.caf(this.resizeId);
        } catch {}
        this.resizeId = null;
      }
      this.resizeId = this.raf(() => {
        this.resizeId = null;
        this.updateInset();
      });
    };

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
        this.backdrop.classList.add("header-aware");
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

    if (this.resizeId !== null) {
      try {
        this.caf(this.resizeId);
      } catch {}
      this.resizeId = null;
    }

    if (this.originalDispatchEvent) {
      try {
        this.backdrop.dispatchEvent = this.originalDispatchEvent;
      } catch {}
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

  if (await handlePersistedSelection(onStart, environment.emitEvents)) {
    return;
  }

  const { modal, buttonContainer } = createRoundSelectModal();

  const positioner = new RoundSelectPositioner(modal);
  positioner.apply();

  const cleanupRegistry = createCleanupRegistry();
  const buttons = wireRoundSelectionButtons({
    modal,
    container: buttonContainer,
    cleanupRegistry,
    onStart
  });

  const modalElement = modal.element;
  document.body.appendChild(modalElement);

  cleanupRegistry.keyboard = setupKeyboardNavigation(modalElement, buttons);

  const tooltipLifecycle = setupTooltipLifecycle(modalElement);
  cleanupRegistry.tooltips = tooltipLifecycle.cleanup;

  modal.open();
  if (buttons.length > 0) {
    try {
      buttons[0].focus();
    } catch {}
  }

  emitBattleEvent("roundOptionsReady");

  await Promise.resolve();
}
