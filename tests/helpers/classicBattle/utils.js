if (typeof console !== "undefined") {
  console.log("[TEST DEBUG] utils.js top-level loaded");
}
// [TEST DEBUG] top-level utils.js

console.log("[TEST DEBUG] top-level utils.js");
import { vi } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { disposeClassicBattleOrchestrator } from "../../../src/helpers/classicBattle/orchestrator.js";

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
  // disposeClassicBattleOrchestrator();
  // vi.resetModules();
  // Ensure the scheduler module used by timer utilities is mocked to use
  // the global timers so tests using fake timers behave deterministically.
  try {
    vi.doMock("../../../src/utils/scheduler.js", () => ({
      onFrame: (cb) => {
        const id = globalThis.setTimeout(() => cb(performance.now()), 16);
        return id;
      },
      onSecondTick: (cb) => {
        const id = globalThis.setInterval(() => cb(performance.now()), 1000);
        return id;
      },
      cancel: (id) => {
        try {
          globalThis.clearTimeout(id);
        } catch {}
        try {
          globalThis.clearInterval(id);
        } catch {}
      },
      stop: () => {}
    }));
  } catch {}
  document.body.innerHTML = "";
  const { playerCard, opponentCard } = createBattleCardContainers();
  const header = createBattleHeader();
  document.body.append(playerCard, opponentCard, header);
  const container = document.createElement("div");
  container.id = "snackbar-container";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  document.body.append(container);

  const timerSpy = {
    useFakeTimers: vi.fn(),
    advanceTimersByTime: vi.fn(),
    runAllTimersAsync: vi.fn(),
    clearAllTimers: vi.fn()
  };
  globalThis.requestAnimationFrame = vi.fn((cb) => cb());
  globalThis.cancelAnimationFrame = vi.fn();
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

  return {
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  };
}
