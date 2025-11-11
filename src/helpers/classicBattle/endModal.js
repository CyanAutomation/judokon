import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { handleReplay } from "./roundManager.js";
import { quitMatch } from "./quitModal.js";
import { getOutcomeMessage } from "../api/battleUI.js";
import { disableStatButtons } from "../battle/battleUI.js";

/**
 * Show the end-of-match modal with Replay and Quit actions.
 *
 * @pseudocode
 * 1. Disable stat buttons and next button to prevent interaction during match end.
 * 2. Build a title, summary text, and actions (Replay, Quit).
 * 3. Create a Modal with accessible labelling and append to body.
 * 4. Wire Replay to `handleReplay(store)` and Quit to `quitMatch(store)`.
 * 5. Open the modal, focusing the Replay button.
 *
 * @param {ReturnType<import('./roundManager.js').createBattleStore>} store
 * @param {{
 *   winner?: 'player'|'opponent'|'none',
 *   scores?: { player: number, opponent: number },
 *   outcome?: string,
 *   message?: string
 * }} [detail]
 * @returns {import('../../components/Modal.js').Modal}
 */
export function showEndModal(store, detail = {}) {
  if (document.getElementById("match-end-modal")) {
    return;
  }

  // Disable interactive elements when match ends to prevent race conditions
  try {
    disableStatButtons();
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(new Error("showEndModal: failed to disable stat buttons"), {
        contexts: { error: { original: error?.message } }
      });
    }
  }

  try {
    const nextButton = document.getElementById("next-button");
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.setAttribute("data-next-ready", "false");
    }
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(new Error("showEndModal: failed to disable next button"), {
        contexts: { error: { original: error?.message } }
      });
    }
  }

  try {
    if (typeof window !== "undefined") {
      const currentCount = Number(window.__classicBattleEndModalCount || 0);
      window.__classicBattleEndModalCount = currentCount + 1;
      window.__classicBattleLastEndModalDetail = detail || null;
    }
  } catch {}
  try {
    if (typeof Sentry !== "undefined" && Sentry?.logger) {
      const { logger } = Sentry;
      const info = logger.fmt`classicBattle:endModal outcome=${detail?.outcome ?? "unknown"}`;
      logger.info(info, {
        outcome: detail?.outcome ?? null,
        playerScore: Number(detail?.scores?.player ?? 0),
        opponentScore: Number(detail?.scores?.opponent ?? 0)
      });
    }
  } catch {}
  const title = document.createElement("h2");
  title.id = "match-end-title";
  title.textContent = "Match Over";

  const desc = document.createElement("p");
  desc.id = "match-end-desc";
  const rawOutcome = typeof detail?.outcome === "string" ? detail.outcome : "";
  const scores = detail?.scores || { player: 0, opponent: 0 };
  let winner = detail?.winner;
  if (!winner) {
    if (rawOutcome === "matchWinPlayer") winner = "player";
    else if (rawOutcome === "matchWinOpponent" || rawOutcome === "quit") winner = "opponent";
    else if (rawOutcome) winner = "none";
    else winner = "player";
  }

  const normalizedScores = {
    player: Number(scores.player) || 0,
    opponent: Number(scores.opponent) || 0
  };

  const resolvedMessage = detail?.message || (rawOutcome ? getOutcomeMessage(rawOutcome) : "");
  let summary = resolvedMessage;
  if (!summary) {
    if (winner === "player") summary = "You win!";
    else if (winner === "opponent") summary = "Opponent wins!";
    else summary = "It's a draw!";
  }

  if (summary) {
    desc.textContent = `${summary} (${normalizedScores.player}-${normalizedScores.opponent})`;
  } else {
    desc.textContent = `(${normalizedScores.player}-${normalizedScores.opponent})`;
  }

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const replay = createButton("Replay", { id: "match-replay-button" });
  const quit = createButton("Quit", { id: "match-quit-button" });
  actions.append(replay, quit);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);
  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  modal.element.id = "match-end-modal";
  replay.addEventListener("click", async () => {
    await handleReplay(store);
    modal.close();
    modal.destroy();
  });
  quit.addEventListener("click", () => {
    try {
      quitMatch(store, quit);
    } finally {
      modal.close();
      modal.destroy();
    }
  });
  document.body.appendChild(modal.element);
  modal.open(replay);
  // Re-enable header navigation since match is over
  try {
    const headerLinks = document.querySelectorAll("header a");
    headerLinks.forEach((link) => (link.style.pointerEvents = ""));
  } catch {}
  return modal;
}
