import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { handleReplay } from "./roundManager.js";
import { quitMatch } from "./quitModal.js";

/**
 * Show the end-of-match modal with Replay and Quit actions.
 *
 * @pseudocode
 * 1. Build a title, summary text, and actions (Replay, Quit).
 * 2. Create a Modal with accessible labelling and append to body.
 * 3. Wire Replay to `handleReplay(store)` and Quit to `quitMatch(store)`.
 * 4. Open the modal, focusing the Replay button.
 *
 * @param {ReturnType<import('./roundManager.js').createBattleStore>} store
 * @param {{ winner?: 'player'|'opponent'|'none', scores?: {player:number, opponent:number} }} [detail]
 * @returns {import('../../components/Modal.js').Modal}
 */
export function showEndModal(store, detail = {}) {
  const title = document.createElement("h2");
  title.id = "match-end-title";
  title.textContent = "Match Over";

  const desc = document.createElement("p");
  desc.id = "match-end-desc";
  const winner = detail?.winner ?? "player";
  const scores = detail?.scores || { player: 0, opponent: 0 };
  let summary = "";
  if (winner === "player") summary = "You win!";
  else if (winner === "opponent") summary = "Opponent wins!";
  else summary = "It's a draw!";
  desc.textContent = `${summary} (${scores.player}-${scores.opponent})`;

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
  return modal;
}
