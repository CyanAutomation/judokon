import { isConsoleMocked, shouldShowTestLogs } from "../../../src/helpers/testLogGate.js";
import { vi } from "vitest";
import { installRAFMock } from "../rafMock.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { disposeClassicBattleOrchestrator } from "../../../src/helpers/classicBattle/orchestrator.js";

export const renderStatsMarkup = (stats) => `
      <ul>
        <li class="stat" data-stat="power"><strong>Power</strong> <span>${stats.power}</span></li>
        <li class="stat" data-stat="speed"><strong>Speed</strong> <span>${stats.speed}</span></li>
        <li class="stat" data-stat="technique"><strong>Technique</strong> <span>${stats.technique}</span></li>
        <li class="stat" data-stat="kumikata"><strong>Kumikata</strong> <span>${stats.kumikata}</span></li>
        <li class="stat" data-stat="newaza"><strong>Newaza</strong> <span>${stats.newaza}</span></li>
      </ul>
    `;

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
    if (String(url).includes("judoka.json")) {
      return [
        {
          id: "judoka-test-1",
          name: "Test Judoka One",
          stats: { power: 5, speed: 4, technique: 3 },
          isHidden: false
        },
        {
          id: "judoka-test-2",
          name: "Test Judoka Two",
          stats: { power: 6, speed: 3, technique: 4 },
          isHidden: false
        }
      ];
    }
    return [];
  });

  const mockPlayerJudoka = {
    id: "player-judoka",
    name: "Mock Player",
    stats: { power: 5, speed: 4, technique: 3, kumikata: 4, newaza: 3 }
  };
  const mockOpponentJudoka = {
    id: "opponent-judoka",
    name: "Mock Opponent",
    stats: { power: 3, speed: 2, technique: 2, kumikata: 1, newaza: 1 }
  };
  const generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
    const { stats } = mockPlayerJudoka;
    container.innerHTML = renderStatsMarkup(stats);
    if (cb) cb(mockPlayerJudoka);
  });
  const getRandomJudokaMock = vi.fn(() => mockOpponentJudoka);
  const renderMock = vi.fn(async (judoka) => {
    const el = document.createElement("div");
    const stats = judoka?.stats ?? mockOpponentJudoka.stats;
    el.innerHTML = renderStatsMarkup(stats);
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
