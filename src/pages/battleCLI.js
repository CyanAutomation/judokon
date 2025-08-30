// Classic Battle CLI bootstrap and controller
// Wires the existing Classic Battle engine/state machine to a terminal-style UI.

import {
  createBattleStore,
  startRound as startRoundCore
} from "../helpers/classicBattle/roundManager.js";
import { initClassicBattleOrchestrator } from "../helpers/classicBattle/orchestrator.js";
import { onBattleEvent, emitBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { STATS } from "../helpers/BattleEngine.js";
import { setPointsToWin } from "../helpers/battleEngineFacade.js";
import { fetchJson } from "../helpers/dataUtils.js";
import { DATA_DIR } from "../helpers/constants.js";

/**
 * Minimal DOM utils for the CLI page
 */
const byId = (id) => document.getElementById(id);

// Track current round judoka so we can compute values without card DOM
let currentPlayerJudoka = null;
let store = null;
let verboseEnabled = false;
let cooldownTimer = null;
let cooldownInterval = null;

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
  const { playerJudoka } = await startRoundCore(store);
  currentPlayerJudoka = playerJudoka || null;
  if (currentPlayerJudoka) renderHiddenPlayerStats(currentPlayerJudoka);
  // Prompt user for input in the bottom line
  setRoundMessage("");
  showBottomLine("Select your move");
}

function getStatByIndex(index1Based) {
  const i = Number(index1Based) - 1;
  return STATS[i] || null;
}

/**
 * Handle global shortcuts that work in any state.
 * @param {string} key
 * @returns {boolean} true if the key was handled
 * @pseudocode
 * if key is 'h':
 *   toggle shortcuts visibility
 *   return true
 * if key is 'r':
 *   toggle retro mode
 *   return true
 * if key is 'q':
 *   dispatch 'interrupt' on the machine
 *   return true
 * return false
 */
export function handleGlobalKey(key) {
  if (key === "h") {
    const sec = byId("cli-shortcuts");
    if (sec) sec.hidden = !sec.hidden;
    return true;
  }
  if (key === "r") {
    setRetroMode(!document.body.classList.contains("retro"));
    return true;
  }
  if (key === "q") {
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("interrupt", { reason: "quit" });
    } catch {}
    return true;
  }
  return false;
}

/**
 * Handle key presses while waiting for the player to select a stat.
 * @param {string} key
 * @pseudocode
 * if key is between '1' and '9':
 *   lookup stat by index
 *   record selection on the store if available
 *   show bottom line with picked stat
 *   dispatch 'statSelected'
 */
export function handleWaitingForPlayerActionKey(key) {
  if (key >= "1" && key <= "9") {
    const stat = getStatByIndex(key);
    if (!stat) return;
    try {
      if (store) {
        store.playerChoice = stat;
        store.selectionMade = true;
      }
    } catch {}
    showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("statSelected");
    } catch {}
  }
}

/**
 * Handle key presses after a round has resolved.
 * @param {string} key
 * @pseudocode
 * if key is Enter or Space:
 *   dispatch 'continue'
 */
export function handleRoundOverKey(key) {
  if (key === "enter" || key === " ") {
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("continue");
    } catch {}
  }
}

/**
 * Handle key presses during cooldown between rounds.
 * @param {string} key
 * @pseudocode
 * if key is Enter or Space:
 *   clear timers
 *   clear bottom line
 *   dispatch 'ready'
 */
export function handleCooldownKey(key) {
  if (key === "enter" || key === " ") {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    clearBottomLine();
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("ready");
    } catch {}
  }
}

/**
 * Dispatch keyboard input based on the current battle state.
 * @param {KeyboardEvent} e
 * @pseudocode
 * key = lowercased key from event
 * if handleGlobalKey(key) handled:
 *   return
 * state = document.body.dataset.battleState
 * table = { waitingForPlayerAction: handleWaitingForPlayerActionKey,
 *           roundOver: handleRoundOverKey,
 *           cooldown: handleCooldownKey }
 * handler = table[state]
 * if handler exists: handler(key)
 */
export function onKeyDown(e) {
  const key = e.key.toLowerCase();
  if (handleGlobalKey(key)) return;
  const state = document.body?.dataset?.battleState || "";
  const table = {
    waitingForPlayerAction: handleWaitingForPlayerActionKey,
    roundOver: handleRoundOverKey,
    cooldown: handleCooldownKey
  };
  const handler = table[state];
  if (handler) handler(key);
}

function handleStatClick(event) {
  const idx = event.target?.dataset?.statIndex;
  if (!idx) return;
  const state = document.body?.dataset?.battleState || "";
  if (state !== "waitingForPlayerAction") return;
  const stat = getStatByIndex(idx);
  if (!stat) return;
  try {
    if (store) {
      store.playerChoice = stat;
      store.selectionMade = true;
    }
  } catch {}
  showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
  try {
    const machine = window.__getClassicBattleMachine?.();
    if (machine) machine.dispatch("statSelected");
  } catch {}
}

function onClickAdvance(event) {
  const state = document.body?.dataset?.battleState || "";
  if (event.target?.closest?.(".cli-stat")) return;
  if (state === "roundOver") {
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("continue");
    } catch {}
  } else if (state === "cooldown") {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    clearBottomLine();
    try {
      const machine = window.__getClassicBattleMachine?.();
      if (machine) machine.dispatch("ready");
    } catch {}
  }
}

function installEventBindings() {
  // Mirror scoreboard message events to CLI message area
  onBattleEvent("scoreboardShowMessage", (e) => {
    setRoundMessage(String(e.detail || ""));
  });
  onBattleEvent("scoreboardClearMessage", () => setRoundMessage(""));

  // CLI-specific countdown handler
  onBattleEvent("countdownStart", (e) => {
    const duration = Number(e.detail?.duration) || 0;
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    if (duration > 0) {
      let remaining = duration;
      showBottomLine(`Next round in: ${remaining}`);
      try {
        cooldownInterval = setInterval(() => {
          remaining -= 1;
          if (remaining > 0) showBottomLine(`Next round in: ${remaining}`);
        }, 1000);
      } catch {}
      try {
        cooldownTimer = setTimeout(() => {
          try {
            emitBattleEvent("countdownFinished");
          } catch {}
        }, duration * 1000);
      } catch {}
    } else {
      try {
        emitBattleEvent("countdownFinished");
      } catch {}
    }
  });

  onBattleEvent("countdownFinished", () => {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    clearBottomLine();
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

  // Append state changes to the verbose log when enabled
  document.addEventListener("battle:state", (ev) => {
    if (!verboseEnabled) return;
    try {
      const { from, to } = ev.detail || {};
      const pre = byId("cli-verbose-log");
      if (!pre) return;
      const ts = new Date();
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const line = `[${hh}:${mm}:${ss}] ${from || "(init)"} -> ${to}`;
      // Keep last 50 lines
      const existing = pre.textContent ? pre.textContent.split("\n").filter(Boolean) : [];
      existing.push(line);
      while (existing.length > 50) existing.shift();
      pre.textContent = existing.join("\n");
      // Auto-scroll to the latest entry
      pre.scrollTop = pre.scrollHeight;
    } catch {}
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
  try {
    window.battleStore = store;
  } catch {}
  // Ensure autostart so the modal is skipped in CLI
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("autostart") !== "1") {
      url.searchParams.set("autostart", "1");
      history.replaceState({}, "", url);
    }
  } catch {}
  // Load stat names and render mapping
  try {
    const stats = await fetchJson(`${DATA_DIR}statNames.json`);
    const list = byId("cli-stats");
    if (list && Array.isArray(stats)) {
      list.innerHTML = "";
      stats
        .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
        .forEach((s) => {
          const idx = Number(s.statIndex) || 0;
          if (!idx) return;
          const div = document.createElement("div");
          div.className = "cli-stat";
          div.setAttribute("role", "button");
          div.setAttribute("tabindex", "0");
          div.dataset.statIndex = String(idx);
          div.textContent = `[${idx}] ${s.name}`;
          list.appendChild(div);
        });
      list.addEventListener("click", handleStatClick);
      // Also enrich the help line with the mapping
      try {
        const help = byId("cli-help");
        if (help) {
          const mapping = stats
            .slice()
            .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
            .map((s) => `[${s.statIndex}] ${s.name}`)
            .join("  ·  ");
          help.textContent = `${help.textContent}  |  ${mapping}`;
        }
      } catch {}
    }
  } catch {}
  // Restore persisted points-to-win if available and sync select
  try {
    const select = byId("points-select");
    const key = "battleCLI.pointsToWin";
    const saved = Number(localStorage.getItem(key));
    if ([5, 10, 15].includes(saved)) {
      setPointsToWin(saved);
      if (select) select.value = String(saved);
    }
    select?.addEventListener("change", () => {
      const val = Number(select.value);
      if ([5, 10, 15].includes(val)) {
        setPointsToWin(val);
        try {
          localStorage.setItem(key, String(val));
        } catch {}
      }
    });
  } catch {}
  // Initialize verbose toggle
  try {
    const vKey = "battleCLI.verbose";
    const checkbox = byId("verbose-toggle");
    const section = byId("cli-verbose-section");
    const saved = localStorage.getItem(vKey);
    verboseEnabled = saved === "true";
    if (checkbox) checkbox.checked = verboseEnabled;
    if (section) section.hidden = !verboseEnabled;
    checkbox?.addEventListener("change", () => {
      verboseEnabled = !!checkbox.checked;
      try {
        localStorage.setItem(vKey, String(verboseEnabled));
      } catch {}
      if (section) section.hidden = !verboseEnabled;
      // If enabling verbose, scroll the log to the latest entry
      if (verboseEnabled) {
        try {
          const pre = byId("cli-verbose-log");
          if (pre) pre.scrollTop = pre.scrollHeight;
        } catch {}
      }
    });
  } catch {}
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
  document.addEventListener("click", onClickAdvance);
}

if (!window.__TEST__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
