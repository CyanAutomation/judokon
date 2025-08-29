import { getScores } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { navigateToHome } from "../navUtils.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { onBattleEvent, emitBattleEvent } from "./battleEvents.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { setSkipHandler } from "./skipHandler.js";

/** @type {{ timer: ReturnType<typeof createRoundTimer>, onExpired: Function }|null} */
let activeCountdown = null;

/**
 * Update the scoreboard with current scores.
 *
 * @pseudocode
 * 1. Read scores via `getScores()`.
 * 2. Forward the values to `scoreboard.updateScore`.
 */
export function syncScoreDisplay() {
  const { playerScore, opponentScore } = getScores();
  if (typeof scoreboard.updateScore === "function") {
    scoreboard.updateScore(playerScore, opponentScore);
    return;
  }
  // Fallback for tests that partially mock setupScoreboard without updateScore
  const el = document.getElementById("score-display");
  if (el) {
    let playerSpan = el.firstElementChild;
    let opponentSpan = el.lastElementChild;
    if (!playerSpan || !opponentSpan) {
      playerSpan = document.createElement("span");
      opponentSpan = document.createElement("span");
      el.append(playerSpan, opponentSpan);
    }
    playerSpan.textContent = `You: ${playerScore}`;
    opponentSpan.textContent = `\nOpponent: ${opponentScore}`;
  }
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
  const { duration } = e.detail || {};
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
      setSkipHandler(null);
      activeCountdown = null;
      emitBattleEvent("countdownFinished");
    };

    activeCountdown = { timer, onExpired };
    attachCooldownRenderer(timer, duration);
    timer.on("expired", onExpired);
    setSkipHandler(() => {
      try {
        timer.off("expired", onExpired);
      } catch {}
      try {
        timer.stop();
      } catch {}
      activeCountdown = null;
    });
    if (!activeCountdown) {
      // A pending skip consumed the countdown before it began
      return;
    }
    timer.start(duration);
  } catch (err) {
    console.error("Error in countdownStart event handler:", err);
  }
});
