import { getScores } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { navigateToHome } from "../navUtils.js";
import * as uiHelpers from "./uiHelpers.js";
import { updateDebugPanel } from "./debugPanel.js";
import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import * as battleEvents from "./battleEvents.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { setSkipHandler } from "./skipHandler.js";

/** @type {{ timer: ReturnType<typeof createRoundTimer>, onExpired: Function }|null} */
let activeCountdown = null;

function handleCountdownExpired() {
  setSkipHandler(null);
  activeCountdown = null;
  battleEvents.emitBattleEvent("countdownFinished");
  battleEvents.emitBattleEvent("round.start");
}

/**
 * Synchronizes the score display on the scoreboard with the current scores from the battle engine.
 *
 * @pseudocode
 * 1. Retrieve the current `playerScore` and `opponentScore` from the battle engine using `getScores()`.
 * 2. If `scoreboard.updateScore` function is available, call it to update the scoreboard component.
 * 3. Locate the `#score-display` element in the DOM.
 * 4. If `#score-display` exists:
 *    a. Check for existing `<span>` elements with `data-side="player"` and `data-side="opponent"`.
 *    b. If these spans are not found, clear the `#score-display` content and create new `<span>` elements for player and opponent scores, appending them to `#score-display`.
 *    c. Update the `textContent` of the player and opponent score spans with the latest scores.
 * 5. Includes debug logging for test environments.
 *
 * @returns {void}
 */
export function syncScoreDisplay() {
  const { playerScore, opponentScore } = getScores();

  // Debug logging for tests
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      console.log("[DEBUG] syncScoreDisplay called:", { playerScore, opponentScore });
    }
  } catch {}

  // Update via the component API when available
  if (typeof scoreboard.updateScore === "function") {
    try {
      scoreboard.updateScore(playerScore, opponentScore);
    } catch {}
  }
  // Always ensure the DOM reflects current scores as a robust fallback
  try {
    const el = document.getElementById("score-display");
    if (el) {
      // Prefer spans with explicit data-side attributes so other scoreboard
      // code can recognize them. Remove any stray text nodes (for example
      // the static scaffold 'You: 0 Opponent: 0') and render two spans.
      let playerSpan = el.querySelector('span[data-side="player"]');
      let opponentSpan = el.querySelector('span[data-side="opponent"]');
      if (!playerSpan || !opponentSpan) {
        // Clear existing content (text nodes or otherwise) and recreate
        // canonical children: <span data-side="player">..</span>\n<span data-side="opponent">..</span>
        el.textContent = "";
        playerSpan = document.createElement("span");
        playerSpan.setAttribute("data-side", "player");
        opponentSpan = document.createElement("span");
        opponentSpan.setAttribute("data-side", "opponent");
        el.append(playerSpan, document.createTextNode("\n"), opponentSpan);
      }
      playerSpan.textContent = `You: ${playerScore}`;
      opponentSpan.textContent = `Opponent: ${opponentScore}`;

      // Debug logging for tests
      try {
        if (typeof process !== "undefined" && process.env && process.env.VITEST) {
          console.log("[DEBUG] syncScoreDisplay updated DOM:", el.textContent);
        }
      } catch {}
    }
  } catch {}
}

/**
 * Show a match summary modal with result message and scores.
 *
 * @pseudocode
 * 1. Build title and score elements.
 * 2. Create Quit and Next buttons using `createButton`.
 * 3. Assemble the modal via `createModal` and append it to the DOM.
 * 4. Both buttons close and destroy the modal:
 *    - Quit navigates to `index.html`.
 *    - Next runs `onNext`.
 *
 * @param {{message: string, playerScore: number, opponentScore: number}} result
 * @param {Function} onNext Callback invoked when starting the next match.
 * @returns {ReturnType<typeof createModal>} Created modal instance.
 */
export function showMatchSummaryModal(result, onNext) {
  const title = document.createElement("h2");
  title.id = "match-summary-title";
  title.textContent = result.message;

  const scoreEl = document.createElement("p");
  scoreEl.id = "match-summary-score";
  scoreEl.textContent = `Final Score – You: ${result.playerScore} Opponent: ${result.opponentScore}`;

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const quit = createButton("Quit Match", {
    id: "match-summary-quit",
    className: "secondary-button"
  });

  const next = createButton("Next Match", { id: "match-summary-next" });

  actions.append(quit, next);

  const frag = document.createDocumentFragment();
  frag.append(title, scoreEl, actions);

  const modal = createModal(frag, { labelledBy: title });

  quit.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    // Navigate to home (robust base path handling)
    navigateToHome();
  });

  next.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    if (typeof onNext === "function") onNext();
  });

  document.body.appendChild(modal.element);
  modal.open();
  return modal;
}

// --- Event bindings ---
function bindUIServiceEventHandlers() {
  // Register listeners exactly once per EventTarget instance
  onBattleEvent("scoreboardClearMessage", () => {
    try {
      scoreboard.clearMessage();
    } catch (err) {
      console.error("Error clearing scoreboard message:", err);
    }
  });

  onBattleEvent("scoreboardShowMessage", (e) => {
    try {
      scoreboard.showMessage(e.detail);
    } catch (err) {
      console.error("Error in scoreboard.showMessage:", err);
    }
  });

  onBattleEvent("debugPanelUpdate", () => {
    try {
      updateDebugPanel();
    } catch (err) {
      console.error("Error updating debug panel:", err);
    }
  });

  onBattleEvent("countdownStart", (e) => {
    // If the skip flag is enabled, immediately finish the countdown
    if (
      uiHelpers.skipRoundCooldownIfEnabled?.({
        onSkip: handleCountdownExpired
      })
    ) {
      return;
    }
    const { duration, onFinished } = e.detail || {};
    if (typeof duration !== "number") return;
    try {
      if (activeCountdown) {
        try {
          activeCountdown.timer.off("expired", activeCountdown.onExpired);
        } catch {}
        try {
          activeCountdown.timer.stop();
        } catch {}
        activeCountdown = null;
      }

      const timer = createRoundTimer();
      const onExpired = () => {
        handleCountdownExpired();
        if (typeof onFinished === "function") {
          onFinished();
        }
      };

      activeCountdown = { timer, onExpired };
      attachCooldownRenderer(timer, duration);
      timer.on("expired", onExpired);
      if (!activeCountdown) {
        // A pending skip consumed the countdown before it began
        return;
      }
      timer.start(duration);
    } catch (err) {
      console.error("Error in countdownStart event handler:", err);
    }
  });
}

/**
 * Bind UI service handlers once per battle event target.
 *
 * Mirrors the previous module-level binding behavior but defers execution
 * until explicitly invoked so tests can control when listeners register.
 *
 * @pseudocode
 * 1. Assume binding should occur; fetch the shared battle event target.
 * 2. Look up (or create) the WeakSet tracking bound targets.
 * 3. If the target is already tracked, skip binding.
 * 4. Otherwise add the target and delegate to `bindUIServiceEventHandlers`.
 *
 * @returns {void}
 */
export function bindUIServiceEventHandlersOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbUiServiceBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindUIServiceEventHandlers();
  }
}
