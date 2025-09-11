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
    if (typeof onStart === "function") await onStart();
    if (emitEvents) {
      emitBattleEvent("startClicked");
      await dispatchBattleEvent("startClicked");
    }
  } catch (err) {
    console.error("Failed to start battle:", err);
  }
}

async function handleRoundSelect({ value, modal, cleanupTooltips, onStart, emitEvents }) {
  persistRoundAndLog(value);
  modal.close();
  try {
    cleanupTooltips();
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

  if (shouldAutostart() || isTestModeEnabled()) {
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

  const frag = document.createDocumentFragment();
  frag.append(title, btnWrap);

  const modal = createModal(frag, { labelledBy: title });

  // Apply game-mode specific positioning and skinning before opening the modal.
  // This ensures the dialog centers within the viewport area beneath the header/scoreboard
  // and adopts page-appropriate styling without changing modal behavior.
  try {
    applyGameModePositioning(modal);
  } catch {}
  let cleanupTooltips = () => {};
  rounds.forEach((r) => {
    const btn = createButton(r.label, { id: `round-select-${r.id}` });
    btn.dataset.tooltipId = `ui.round${r.label}`;
    btn.addEventListener("click", () =>
      handleRoundSelect({
        value: r.value,
        modal,
        cleanupTooltips,
        onStart,
        emitEvents: true
      })
    );
    btnWrap.appendChild(btn);
  });

  document.body.appendChild(modal.element);
  // Initialize tooltips asynchronously so modal presentation is not
  // delayed by tooltip data or sanitizer setup. Attach a cleanup when
  // the async init completes; failures are non-fatal for modal display.
  initTooltips(modal.element)
    .then((fn) => {
      cleanupTooltips = fn;
    })
    .catch((err) => {
      console.error("Failed to initialize tooltips:", err);
    });
  modal.open();
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

  const cliHeader = document.getElementById("cli-header") || document.querySelector(".cli-header");
  const classicHeader =
    document.querySelector('header[role="banner"]') || document.querySelector("header");
  const isCliMode = Boolean(cliHeader);
  const header = (isCliMode ? cliHeader : classicHeader) || null;

  // Add skin class first so themes can override dialog styles deterministically
  try {
    backdrop.classList.add(isCliMode ? "cli-modal" : "classic-modal");
  } catch {}

  if (!header) return;

  const updateInset = () => {
    try {
      const h = header.offsetHeight;
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
    if (resizeId) caf(resizeId);
    resizeId = raf(updateInset);
  };
  try {
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
  } catch {}

  const cleanup = () => {
    try {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (resizeId) caf(resizeId);
    } catch {}
    try {
      backdrop.removeEventListener("close", cleanup);
    } catch {}
  };

  try {
    backdrop.addEventListener("close", cleanup, { once: true });
  } catch {}
}
