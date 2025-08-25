import { onDomReady } from "../domReady.js";
import { waitForOpponentCard } from "../battleJudokaPage.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted → showSelectionPrompt)
import "./roundUI.js";
import { battleDomConfig } from "./domConfig.js";

Object.assign(battleDomConfig, {
  debugOutput: "#debug-output",
  roundMessage: "#round-message",
  nextButton: "#next-button",
  opponentCard: "#opponent-card",
  roundResult: "#round-result",
  roundRetryModal: "#round-retry-modal",
  statButtons: "#stat-buttons",
  battleStateBadge: "#battle-state-badge",
  scoreboardRight: "#scoreboard-right",
  debugPanel: "#debug-panel",
  battleArea: "#battle-area",
  statHelp: "#stat-help",
  quitMatchButton: "#quit-match-button",
  nextRoundTimer: "#next-round-timer",
  playerCard: "#player-card"
});

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 */
export async function setupClassicBattlePage() {
  const view = new ClassicBattleView({ waitForOpponentCard });
  const controller = new ClassicBattleController({
    waitForOpponentCard: view.waitForOpponentCard
  });
  view.bindController(controller);
  await controller.init();
  await view.init();
}

if (typeof process === "undefined" || process.env.VITEST !== "true") {
  onDomReady(setupClassicBattlePage);
}
