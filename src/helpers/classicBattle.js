import { drawCards, _resetForTest as resetSelection } from "./classicBattle/cardSelection.js";
import { startTimer, scheduleNextRound } from "./classicBattle/timerControl.js";
import {
  showSelectionPrompt,
  revealComputerCard,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
import {
  handleStatSelection as engineHandleStatSelection,
  quitMatch as engineQuitMatch,
  getScores,
  _resetForTest as engineReset,
  STATS
} from "./battleEngine.js";
import * as infoBar from "./setupBattleInfoBar.js";
import { getStatValue, resetStatButtons, showResult } from "./battle/index.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";

export function getStartRound() {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
  return startRound;
}

let quitModal = null;
let statTimeoutId = null;
let autoSelectId = null;
let latestScores = null;
let lastScoreUpdate = 0;
let scoreSocket = null;
let pollIntervalId = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

/**
 * Display match summary with final message and scores.
 *
 * @pseudocode
 * 1. Find the summary panel and text elements.
 * 2. Insert the result message and scores.
 * 3. Reveal the panel by removing the hidden class.
 *
 * @param {{message: string, playerScore: number, computerScore: number}} result
 */
function showSummary(result) {
  const panel = document.getElementById("summary-panel");
  const messageEl = document.getElementById("summary-message");
  const scoreEl = document.getElementById("summary-score");
  if (panel && messageEl && scoreEl) {
    messageEl.textContent = result.message;
    scoreEl.textContent = `Final Score – You: ${result.playerScore} Opponent: ${result.computerScore}`;
    panel.classList.remove("hidden");
  }
}

/**
 * Reset match state and start a new game.
 *
 * @pseudocode
 * 1. Reset engine scores and flags.
 * 2. Hide the summary panel and clear the last round message.
 * 3. Call the start round function to begin a new match.
 */
async function handleReplay() {
  engineReset();
  const panel = document.getElementById("summary-panel");
  if (panel) panel.classList.add("hidden");
  const msgEl = document.getElementById("round-message");
  if (msgEl) msgEl.textContent = "";
  const startRoundFn = getStartRound();
  await startRoundFn();
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat after a short delay.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `infoBar.showMessage`.
 * 2. After 5 seconds choose a random stat from `STATS`.
 * 3. Call `handleStatSelection` with the chosen stat.
 */
function onStatSelectionTimeout() {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  autoSelectId = setTimeout(() => {
    const randomStat = STATS[Math.floor(Math.random() * STATS.length)];
    handleStatSelection(randomStat);
  }, 5000);
}

/**
 * Parse score payloads and update the Info Bar.
 *
 * @pseudocode
 * 1. Convert the input to an object.
 * 2. When values are numbers, store and forward them to `infoBar.updateScore`.
 * 3. On failure, show `"Waiting…"`.
 */
function handleScorePayload(data) {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const { playerScore, computerScore } = parsed;
    if (typeof playerScore === "number" && typeof computerScore === "number") {
      latestScores = { playerScore, computerScore };
      lastScoreUpdate = Date.now();
      infoBar.updateScore(playerScore, computerScore);
      return true;
    }
  } catch {
    // ignore malformed payloads
  }
  infoBar.showMessage("Waiting…");
  return false;
}

/**
 * Poll the backend for updated scores with retry logic.
 *
 * @pseudocode
 * 1. Fetch the score JSON from `url` with a 2s timeout.
 * 2. On success, call `handleScorePayload` and reset the retry delay.
 * 3. On failure, show `"Waiting…"` and retry with exponential backoff.
 */
function startPolling(url) {
  clearInterval(pollIntervalId);
  async function poll() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      handleScorePayload(data);
      reconnectDelay = 1000;
    } catch {
      clearTimeout(timeoutId);
      infoBar.showMessage("Waiting…");
      clearInterval(pollIntervalId);
      setTimeout(() => startPolling(url), reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }
  }
  pollIntervalId = setInterval(poll, 5000);
  poll();
}

/**
 * Establish a WebSocket for score updates with polling fallback.
 *
 * @pseudocode
 * 1. Try to open a WebSocket to `wsUrl`.
 * 2. Forward `message` events to `handleScorePayload`.
 * 3. On error or close, display an Info Bar message and retry or fall back to polling.
 */
function connectScoreSocket(wsUrl, pollUrl) {
  if (scoreSocket) return;
  try {
    scoreSocket = new WebSocket(wsUrl);
  } catch {
    startPolling(pollUrl);
    return;
  }
  scoreSocket.addEventListener("message", (e) => handleScorePayload(e.data));
  scoreSocket.addEventListener("open", () => {
    reconnectDelay = 1000;
  });
  scoreSocket.addEventListener("close", () => {
    scoreSocket = null;
    infoBar.showMessage("Connection lost. Retrying…");
    setTimeout(() => connectScoreSocket(wsUrl, pollUrl), reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  });
  scoreSocket.addEventListener("error", () => {
    infoBar.showMessage("Connection error. Switching to polling…");
    scoreSocket?.close();
    scoreSocket = null;
    startPolling(pollUrl);
  });
}

/**
 * Begin real-time score synchronization if not already active.
 *
 * @pseudocode
 * 1. Exit early on server-side renders.
 * 2. Skip when a socket or poller already exists.
 * 3. Connect to the backend via `connectScoreSocket`.
 */
function startScoreSync() {
  if (typeof window === "undefined") return;
  if (scoreSocket || pollIntervalId) return;
  // Dynamically construct the WebSocket URL based on the current location
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}//${wsHost}/classic-battle`;
  const pollUrl = "/api/classic-battle/score";
  connectScoreSocket(wsUrl, pollUrl);
}

/**
 * Update the info bar with current scores and show a waiting message when
 * synchronizing with the backend fails.
 *
 * @pseudocode
 * 1. Attempt to read scores via `getScores()`.
 * 2. When scores are not numbers or an error occurs, display
 *    `"Waiting…"` using `infoBar.showMessage` and return false.
 * 3. Otherwise, update the score display and return true.
 *
 * @returns {boolean} True when scores were updated, false on failure.
 */
function syncScoreDisplay() {
  if (latestScores) {
    const stale = Date.now() - lastScoreUpdate > 5000;
    infoBar.updateScore(latestScores.playerScore, latestScores.computerScore);
    if (stale) {
      infoBar.showMessage("Waiting…");
      return false;
    }
    return true;
  }
  try {
    const { playerScore, computerScore } = getScores();
    if (typeof playerScore === "number" && typeof computerScore === "number") {
      infoBar.updateScore(playerScore, computerScore);
      return true;
    }
  } catch {
    // ignore and fall through
  }
  infoBar.showMessage("Waiting…");
  return false;
}

function createQuitConfirmation(onConfirm) {
  const title = document.createElement("h2");
  title.id = "quit-modal-title";
  title.textContent = "Quit the match?";

  const desc = document.createElement("p");
  desc.id = "quit-modal-desc";
  desc.textContent = "Your progress will be lost.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton("Cancel", {
    id: "cancel-quit-button",
    className: "secondary-button"
  });
  const quit = createButton("Quit", { id: "confirm-quit-button" });
  actions.append(cancel, quit);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", modal.close);
  quit.addEventListener("click", () => {
    onConfirm();
    modal.close();
    window.location.href = "../../index.html";
  });
  document.body.appendChild(modal.element);
  return modal;
}

export async function startRound() {
  startScoreSync();
  resetStatButtons();
  disableNextRoundButton();
  await drawCards();
  showSelectionPrompt();
  syncScoreDisplay();
  await startTimer(handleStatSelection);
  statTimeoutId = setTimeout(onStatSelectionTimeout, 35000);
  updateDebugPanel();
}

export function evaluateRound(stat) {
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  const playerVal = getStatValue(playerContainer, stat);
  const compVal = getStatValue(computerContainer, stat);
  const result = engineHandleStatSelection(playerVal, compVal);
  if (result.message) {
    showResult(result.message);
  }
  syncScoreDisplay();
  updateDebugPanel();
  return result;
}

export async function handleStatSelection(stat) {
  clearTimeout(statTimeoutId);
  clearTimeout(autoSelectId);
  await revealComputerCard();
  const result = evaluateRound(stat);
  resetStatButtons();
  scheduleNextRound(result, getStartRound());
  if (result.matchEnded) {
    showSummary(result);
  }
  updateDebugPanel();
}

export function quitMatch() {
  if (!quitModal) {
    quitModal = createQuitConfirmation(() => {
      const result = engineQuitMatch();
      showResult(result.message);
    });
  }
  const trigger = document.getElementById("quit-match-button");
  quitModal.open(trigger ?? undefined);
}

export function _resetForTest() {
  resetSelection();
  engineReset();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  clearTimeout(statTimeoutId);
  clearTimeout(autoSelectId);
  statTimeoutId = null;
  autoSelectId = null;
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-message");
  if (resultEl) resultEl.textContent = "";
  const nextBtn = document.getElementById("next-round-button");
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    nextBtn.replaceWith(clone);
    clone.disabled = true;
  }
  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
  if (quitModal) {
    quitModal.element.remove();
    quitModal = null;
  }
  syncScoreDisplay();
  updateDebugPanel();
}

export {
  revealComputerCard,
  enableNextRoundButton,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
export { getComputerJudoka } from "./classicBattle/cardSelection.js";
export { scheduleNextRound } from "./classicBattle/timerControl.js";
export { syncScoreDisplay as _syncScoreDisplay };

const quitButton = document.getElementById("quit-match-button");
if (quitButton) {
  quitButton.addEventListener("click", () => {
    quitMatch();
  });
}

const replayButton = document.getElementById("replay-button");
if (replayButton) {
  replayButton.addEventListener("click", () => {
    handleReplay();
  });
}
