import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { setPointsToWin } from "../battleEngineFacade.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./orchestrator.js";
import { wrap } from "../storage.js";
import { POINTS_TO_WIN_OPTIONS, DEFAULT_POINTS_TO_WIN } from "../../config/battleDefaults.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { logEvent } from "../telemetry.js";
import { t } from "../i18n.js";
import rounds from "../../data/battleRounds.js";

/**
 * Check if the URL requests an automatic start.
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

function persistRoundSelection(value) {
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
  persistRoundSelection(value);
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
  let cleanupTooltips = () => {};
  rounds.forEach((r) => {
    const btn = createButton(r.label, { id: `round-select-${r.id}` });
    btn.dataset.tooltipId = `ui.round${r.label}`;
    btn.addEventListener("click", () =>
      handleRoundSelect({
        value: r.value,
        modal,
        cleanupTooltips: () => cleanupTooltips(),
        onStart,
        emitEvents: true
      })
    );
    btnWrap.appendChild(btn);
  });

  document.body.appendChild(modal.element);
  try {
    cleanupTooltips = await initTooltips(modal.element);
  } catch (err) {
    console.error("Failed to initialize tooltips:", err);
  }
  modal.open();
  emitBattleEvent("roundOptionsReady");
}
