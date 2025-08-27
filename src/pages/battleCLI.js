// Classic Battle CLI bootstrap and controller
// Wires the existing Classic Battle engine/state machine to a terminal-style UI.

import { createBattleStore, startRound as startRoundCore } from "../helpers/classicBattle/roundManager.js";
import { initClassicBattleOrchestrator } from "../helpers/classicBattle/orchestrator.js";
import { onBattleEvent, emitBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { STATS } from "../helpers/BattleEngine.js";

/**
 * Minimal DOM utils for the CLI page
 */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

// Track current round judoka so we can compute values without card DOM
let currentPlayerJudoka = null;
let currentOpponentJudoka = null;
let store = null;

function setRetroMode(enabled) {
  document.body.classList.toggle("retro", !!enabled);
}

function updateScoreLine(player, opponent) {
  const el = byId("cli-score");
  if (!el) return;
  el.textContent = `You: ${player}  Opponent: ${opponent}`;
}

function setRoundMessage(text) {
  const el = byId("round-message");
  if (el) el.textContent = text || "";
}

function showBottomLine(text) {
  // Render as a single bottom line using the snackbar container
  try {
    // Lazily create a minimal snackbar child if missing
    const container = byId("snackbar-container");
    if (!container) return;
    let bar = container.querySelector(".snackbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "snackbar";
      container.appendChild(bar);
    }
    bar.textContent = text || "";
  } catch {}
}

function clearBottomLine() {
  showBottomLine("");
}

function renderHiddenPlayerStats(judoka) {
  // Provide a hidden #player-card with li.stat value spans so engine guards can read values.
  let container = byId("player-card");
  if (!container) {
    container = document.createElement("div");
    container.id = "player-card";
    container.style.display = "none";
    document.body.appendChild(container);
  }
  const ul = document.createElement("ul");
  for (const stat of STATS) {
    const li = document.createElement("li");
    li.className = "stat";
    const span = document.createElement("span");
    const val = Number(judoka?.stats?.[stat]) || 0;
    span.textContent = String(val);
    li.appendChild(span);
    ul.appendChild(li);
  }
  container.replaceChildren(ul);
}

async function startRoundWrapper() {
  // Use the core startRound to select judoka; capture results and prepare hidden values.
  const { playerJudoka, opponentJudoka } = await startRoundCore(store);
  currentPlayerJudoka = playerJudoka || null;
  currentOpponentJudoka = opponentJudoka || null;
  if (currentPlayerJudoka) renderHiddenPlayerStats(currentPlayerJudoka);
  // Prompt user for input in the bottom line
  setRoundMessage("");
  showBottomLine("Select your move");
}

function getStatByIndex(index1Based) {
  const i = Number(index1Based) - 1;
  return STATS[i] || null;
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  if (key === "h") {
    // Toggle shortcuts visibility
    const sec = byId("cli-shortcuts");
    if (sec) sec.hidden = !sec.hidden;
    return;
  }
  if (key === "r") {
    setRetroMode(!document.body.classList.contains("retro"));
    return;
  }
  // Only handle gameplay keys when the machine is ready
  const state = document.body?.dataset?.battleState || "";
  if (state === "waitingForPlayerAction") {
    if (key >= "1" && key <= "9") {
      const stat = getStatByIndex(key);
      if (!stat) return;
      try {
        // Record selection on the store; machine will transition to roundDecision
        if (store) {
          store.playerChoice = stat;
          store.selectionMade = true;
        }
      } catch {}
      showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
      // Move to roundDecision; resolution will read from hidden #player-card and opponent module state
      try {
        const machine = window.__getClassicBattleMachine?.();
        if (machine) machine.dispatch("statSelected");
      } catch {}
    }
  } else if (state === "roundOver") {
    if (key === "enter" || key === " ") {
      try {
        const machine = window.__getClassicBattleMachine?.();
        if (machine) machine.dispatch("continue");
      } catch {}
    }
  } else if (key === "q") {
    // Quit at any time → interrupt path
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("interrupt", { reason: "quit" });
    } catch {}
  }
}

function installEventBindings() {
  // Mirror scoreboard message events to CLI message area
  onBattleEvent("scoreboardShowMessage", (e) => {
    setRoundMessage(String(e.detail || ""));
  });
  onBattleEvent("scoreboardClearMessage", () => setRoundMessage(""));

  // Render countdown in the bottom line and signal when finished
  onBattleEvent("countdownStart", (e) => {
    const duration = Number(e?.detail?.duration) || 0;
    if (!duration) return;
    let remaining = duration;
    showBottomLine(`Next round in: ${remaining}s`);
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(id);
        clearBottomLine();
        emitBattleEvent("countdownFinished");
        return;
      }
      showBottomLine(`Next round in: ${remaining}s`);
    }, 1000);
  });

  // After round resolves, update message and score
  onBattleEvent("roundResolved", (e) => {
    const { result, stat, playerVal, opponentVal } = e.detail || {};
    if (result) {
      setRoundMessage(
        `${result.message} (${String(stat || "").toUpperCase()} – You: ${playerVal} Opponent: ${opponentVal})`
      );
      updateScoreLine(result.playerScore ?? 0, result.opponentScore ?? 0);
    }
  });
}

function installRetroStyles() {
  const style = document.createElement("style");
  style.textContent = `
    body.retro .cli-block { border: none; background: #0a0a0a; position: relative; }
    body.retro .cli-block::before,
    body.retro .cli-block::after { content: ""; position: absolute; left: 0; right: 0; height: 1px; background: #5e5e5e; }
    body.retro .cli-block::before { top: 0; }
    body.retro .cli-block::after { bottom: 0; }
    body.retro .cli-header, body.retro .cli-footer { background: #080808; }
    /* Snackbar bottom line look */
    #snackbar-container { padding: 8px 12px; }
    #snackbar-container .snackbar { color: #e6e6e6; }
  `;
  document.head.appendChild(style);
}

async function init() {
  installRetroStyles();
  store = createBattleStore();
  // Expose store for debug panels if needed
  try { window.battleStore = store; } catch {}
  // Install CLI event bridges
  installEventBindings();
  // Initialize orchestrator using our startRound wrapper
  await initClassicBattleOrchestrator(store, startRoundWrapper);
  // Autostart if requested
  try {
    const autostart = new URLSearchParams(location.search).get("autostart");
    if (autostart === "1") {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("startClicked");
    }
  } catch {}
  // Keyboard controls
  window.addEventListener("keydown", onKeyDown);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

