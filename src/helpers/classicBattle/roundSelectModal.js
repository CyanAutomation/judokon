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

async function handleRoundSelect({
  value,
  modal,
  cleanupTooltips,
  cleanupKeyboard,
  onStart,
  emitEvents
}) {
  persistRoundAndLog(value);
  modal.close();
  try {
    modal.element.dispatchEvent(new Event("close"));
  } catch {}
  try {
    cleanupTooltips();
  } catch {}
  try {
    cleanupKeyboard();
  } catch {}
  try {
    modal.destroy();
  } catch {}
  await startRound(value, onStart, emitEvents);
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
  const IS_VITEST = typeof process !== "undefined" && process.env && process.env.VITEST === "true";

  // Detect Playwright test environment, but allow tests to opt-in to showing the modal
  const IS_PLAYWRIGHT =
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("Headless") || navigator.webdriver === true);

  // Check if test wants to see the modal (via feature flag override)
  const showModalInTest =
    typeof window !== "undefined" &&
    window.__FF_OVERRIDES &&
    window.__FF_OVERRIDES.showRoundSelectModal;

  // Auto-start unless explicitly disabled by the test override. Tests
  // may opt-in to seeing the modal even when Test Mode is enabled by
  // setting `window.__FF_OVERRIDES.showRoundSelectModal = true`.
  if (
    shouldAutostart() ||
    (isTestModeEnabled() && !showModalInTest) ||
    (IS_PLAYWRIGHT && !showModalInTest)
  ) {
    await startRound(DEFAULT_POINTS_TO_WIN, onStart, !IS_VITEST);
    return;
  }

  try {
    // Use localStorage directly to match how tests set values via page.addInitScript
    const storage = wrap(BATTLE_POINTS_TO_WIN);
    const saved = storage.get();
    if (POINTS_TO_WIN_OPTIONS.includes(Number(saved))) {
      try {
        logEvent("battle.start", { pointsToWin: Number(saved), source: "storage" });
      } catch {}
      await startRound(Number(saved), onStart, !IS_VITEST);
      return;
    }
  } catch {}

  const title = document.createElement("h2");
  title.id = "round-select-title";
  title.textContent = t("modal.roundSelect.title");

  const btnWrap = document.createElement("div");
  btnWrap.className = "round-select-buttons";

  // Add keyboard instructions
  const instructions = document.createElement("p");
  instructions.className = "round-select-instructions";
  instructions.textContent = "Use number keys (1-3) or arrow keys to select";

  const frag = document.createDocumentFragment();
  frag.append(title, instructions, btnWrap);

  const modal = createModal(frag, { labelledBy: title });

  // Apply game-mode specific positioning and skinning before opening the modal.
  // This ensures the dialog centers within the viewport area beneath the header/scoreboard
  // and adopts page-appropriate styling without changing modal behavior.
  const cleanup = {
    tooltips: () => {}
  };

  // Add keyboard event handler for round selection
  const handleKeyDown = (e) => {
    const buttons = Array.from(btnWrap.querySelectorAll("button"));
    const currentFocus = document.activeElement;
    const currentIndex = buttons.indexOf(currentFocus);

    switch (e.key) {
      case "1":
        e.preventDefault();
        buttons[0]?.click();
        break;
      case "2":
        e.preventDefault();
        buttons[1]?.click();
        break;
      case "3":
        e.preventDefault();
        buttons[2]?.click();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentIndex > 0) {
          buttons[currentIndex - 1].focus();
        } else {
          buttons[buttons.length - 1].focus();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (currentIndex < buttons.length - 1) {
          buttons[currentIndex + 1].focus();
        } else {
          buttons[0].focus();
        }
        break;
      case "Enter":
        e.preventDefault();
        if (currentFocus && buttons.includes(currentFocus)) {
          currentFocus.click();
        }
        break;
    }
  };

  // Attach keyboard handler to modal element
  modal.element.addEventListener("keydown", handleKeyDown);

  // Create cleanup function for keyboard handler
  const cleanupKeyboard = () => {
    modal.element.removeEventListener("keydown", handleKeyDown);
  };

  const roundButtons = [];
  rounds.forEach((r) => {
    const btn = createButton(r.label, { id: `round-select-${r.id}` });
    btn.dataset.tooltipId = `ui.round${r.label}`;
    btn.addEventListener("click", () =>
      handleRoundSelect({
        value: r.value,
        modal,
        cleanupTooltips: cleanup.tooltips,
        cleanupKeyboard,
        onStart,
        emitEvents: true
      })
    );
    btnWrap.appendChild(btn);
    roundButtons.push(btn);
  });

  document.body.appendChild(modal.element);
  // Initialize tooltips asynchronously so modal presentation is not
  // delayed by tooltip data or sanitizer setup. Attach a cleanup when
  // the async init completes; failures are non-fatal for modal display.
  initTooltips(modal.element)
    .then((fn) => {
      cleanup.tooltips = fn;
    })
    .catch((err) => {
      console.error("Failed to initialize tooltips:", err);
    });
  modal.open();
  // Focus the first round select button for accessibility
  if (roundButtons.length > 0) {
    roundButtons[0].focus();
  }
  emitBattleEvent("roundOptionsReady");
  // Give a microtask tick so any asynchronous tooltip initialization
  // rejection is handled (tests expect console.error to run before
  // this function returns) while still not awaiting tooltip setup.
  await Promise.resolve();
}

/**
 * Apply header-aware positioning and game mode skin to the round select modal.
 *
 * @pseudocode
 * 1. Detect game mode (CLI vs Classic) by presence of `#cli-header`/`.cli-header`.
 * 2. Find the header element and read its height.
 * 3. Set `--modal-inset-top` on the backdrop and add `header-aware` class.
 * 4. Add a mode-specific class: `cli-modal` or `classic-modal` on the backdrop.
 * 5. Track resize/orientation changes while open and update inset accordingly.
 *
 * @param {{ element: HTMLElement }} modal - Modal instance created by `createModal`.
 */
function applyGameModePositioning(modal) {
  const backdrop = modal?.element;
  if (!backdrop) return;

  const closedProp = "__roundSelectPositioningClosed";
  if (backdrop[closedProp]) {
    return;
  }

  const datasetKey = "roundSelectModalActive";
  const activeProp = "__roundSelectPositioningActive";
  const setActiveMarker = (value) => {
    try {
      backdrop.dataset[datasetKey] = value ? "true" : "false";
    } catch {}
  };
  setActiveMarker(true);
  backdrop[activeProp] = true;

  const originalClose = typeof modal?.close === "function" ? modal.close.bind(modal) : null;
  const originalDestroy = typeof modal?.destroy === "function" ? modal.destroy.bind(modal) : null;
  const originalDispatchEvent =
    typeof backdrop.dispatchEvent === "function" ? backdrop.dispatchEvent.bind(backdrop) : null;

  const cliHeader = document.getElementById("cli-header") || document.querySelector(".cli-header");
  const classicHeader =
    document.querySelector('header[role="banner"]') || document.querySelector("header");
  const isCliMode = Boolean(cliHeader);
  const headerEl = (isCliMode ? cliHeader : classicHeader) || null;

  // Add skin class first so themes can override dialog styles deterministically
  try {
    backdrop.classList.add(isCliMode ? "cli-modal" : "classic-modal");
  } catch {}

  if (!headerEl) return;

  let headerRef = headerEl;

  let isActive = true;
  const updateInset = () => {
    if (!isActive) return;
    if (!backdrop[activeProp]) return;
    if (backdrop.dataset?.[datasetKey] !== "true") return;
    try {
      const h = headerRef?.offsetHeight;
      if (Number.isFinite(h) && h >= 0) {
        backdrop.style.setProperty("--modal-inset-top", `${h}px`);
        backdrop.classList.add("header-aware");
      }
    } catch {}
  };

  // Initial compute
  updateInset();

  // Track resize/orientation while modal is mounted; clean up on close
  let resizeId = null;
  const raf =
    typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 0);
  const caf =
    typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (id) => clearTimeout(id);
  const onResize = () => {
    if (!isActive) return;
    if (resizeId !== null) {
      caf(resizeId);
      resizeId = null;
    }
    resizeId = raf(() => {
      resizeId = null;
      updateInset();
    });
  };
  try {
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
  } catch {}

  const cleanup = () => {
    if (!isActive) return;
    isActive = false;
    setActiveMarker(false);
    if (originalDispatchEvent) {
      try {
        backdrop.dispatchEvent = originalDispatchEvent;
      } catch {}
    }
    try {
      backdrop.removeEventListener("close", cleanup);
    } catch {}
    try {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    } catch {}
    if (resizeId !== null) {
      try {
        caf(resizeId);
      } catch {}
      resizeId = null;
    }
    backdrop[activeProp] = false;
    backdrop[closedProp] = true;
    headerRef = null;
  };

  try {
    backdrop.addEventListener("close", cleanup);
  } catch {}

  if (originalDispatchEvent) {
    backdrop.dispatchEvent = (event) => {
      let result;
      let error;
      try {
        result = originalDispatchEvent(event);
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

  if (originalClose) {
    modal.close = (...args) => {
      const result = originalClose(...args);
      cleanup();
      return result;
    };
  }

  if (originalDestroy) {
    modal.destroy = (...args) => {
      cleanup();
      return originalDestroy(...args);
    };
  }
}
