import { isConsoleMocked, shouldShowTestLogs } from "../../../src/helpers/testLogGate.js";
import { vi } from "vitest";
import { installRAFMock } from "../rafMock.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { disposeClassicBattleOrchestrator } from "../../../src/helpers/classicBattle/orchestrator.js";

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] utils.js top-level loaded");

/**
 * @pseudocode
 * reset environment
 *   - reset Vitest modules
 *   - clear document body
 * build DOM nodes
 *   - create player/opponent cards and battle header
 *   - append nodes and snackbar container to body
 * mock APIs
 *   - use fake timers
 *   - mock fetchJson, generateRandomCard, getRandomJudoka, render
 * return configured spies/mocks
 *   - expose timerSpy, mocks, and currentFlags
 */
export function setupClassicBattleDom() {
  disposeClassicBattleOrchestrator();
  // vi.resetModules(); // Temporarily disabled to fix test timeouts
  const timerSpy = vi.useFakeTimers();

  // Install shared queue-based RAF mock helper
  const rafMock = installRAFMock();


  // Let Vitest's fake timers handle setTimeout/clearTimeout automatically
  // globalThis.setTimeout = vi.fn((cb, delay) => {
  //   return setTimeout(cb, delay);
  // });
  // globalThis.clearTimeout = vi.fn((id) => {
  //   clearTimeout(id);
  // });
  const fetchJsonMock = vi.fn(async (url) => {
    if (String(url).includes("gameTimers.js")) {
      return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
    }
    return [];
  });
  const generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
    container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    if (cb) cb({ id: 1 });
  });
  const getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
  const renderMock = vi.fn(async () => {
    const el = document.createElement("div");
    el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    return el;
  });
  const currentFlags = { autoSelect: { enabled: true } };

  // Build minimal DOM expected by many classicBattle tests. Some tests
  // create their own nodes explicitly; appending only when missing keeps
  // this helper safe and idempotent across tests.
  try {
    if (typeof document !== "undefined" && document.body) {
      // Header (round-message, next-round-timer, score-display)
      // Only append if not already present
      if (!document.querySelector("header #round-message")) {
        const header = createBattleHeader();
        document.body.appendChild(header);
      }
      if (!document.getElementById("player-card") || !document.getElementById("opponent-card")) {
        const { playerCard, opponentCard } = createBattleCardContainers();
        // Insert cards before header for consistency with other tests
        const headerEl = document.querySelector("header");
        if (headerEl) {
          headerEl.before(playerCard, opponentCard);
        } else {
          document.body.append(playerCard, opponentCard);
        }
      }
      if (!document.getElementById("snackbar-container")) {
        const el = document.createElement("div");
        el.id = "snackbar-container";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
      }
      if (!document.getElementById("stat-buttons")) {
        const div = document.createElement("div");
        div.id = "stat-buttons";
        // Add a default power button so selection helpers can find buttons
        const btn = document.createElement("button");
        btn.setAttribute("data-stat", "power");
        div.appendChild(btn);
        document.body.appendChild(div);
      }
    }
  } catch {
    // Be liberal in what we accept in tests; swallow DOM setup errors
    // so mocking issues don't break unrelated tests.
  }

  return {
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags,
    restoreRAF: rafMock.restore
  };
}
