import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";

async function loadBattleCLI(statKeys = ["speed"]) {
  const emitter = new EventTarget();
  const handlers = {};
  const emitBattleEvent = vi.fn((type, detail) => {
    (handlers[type] || []).forEach((h) => h({ detail }));
  });
  const onBattleEvent = vi.fn((type, handler) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(handler);
  });
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn(() => false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent,
    emitBattleEvent
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: statKeys }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(() => 10),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(
      statKeys.map((key, i) => ({
        statIndex: i + 1,
        name: key.charAt(0).toUpperCase() + key.slice(1)
      }))
    )
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  await mod.__test.init();
  return { __test: mod.__test, emitBattleEvent };
}

describe("battleCLI accessibility", () => {
  it("marks countdown and round message as polite live regions", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    const roundMsg = document.getElementById("round-message");
    const countdown = document.getElementById("cli-countdown");
    expect(roundMsg?.getAttribute("role")).toBe("status");
    expect(roundMsg?.getAttribute("aria-live")).toBe("polite");
    expect(countdown?.getAttribute("role")).toBe("status");
    expect(countdown?.getAttribute("aria-live")).toBe("polite");
  });

  describe("focus management", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      window.__TEST__ = true;
      document.body.innerHTML = `
        <div id="cli-countdown" role="status" aria-live="polite"></div>
        <div id="round-message" role="status" aria-live="polite"></div>
        <div id="cli-stats" tabindex="0"></div>
        <div id="cli-help"></div>
        <select id="points-select"></select>
        <section id="cli-verbose-section" hidden>
          <pre id="cli-verbose-log"></pre>
        </section>
        <input id="verbose-toggle" type="checkbox" />
        <div id="snackbar-container"></div>
      `;
      const machine = { dispatch: vi.fn() };
      debugHooks.exposeDebugState(
        "getClassicBattleMachine",
        vi.fn(() => machine)
      );
    });

    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = "";
      delete window.__TEST__;
      debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
      vi.resetModules();
      vi.clearAllMocks();
      vi.doUnmock("../../src/helpers/featureFlags.js");
      vi.doUnmock("../../src/helpers/classicBattle/roundManager.js");
      vi.doUnmock("../../src/helpers/classicBattle/orchestrator.js");
      vi.doUnmock("../../src/helpers/classicBattle/battleEvents.js");
      vi.doUnmock("../../src/helpers/BattleEngine.js");
      vi.doUnmock("../../src/helpers/battleEngineFacade.js");
      vi.doUnmock("../../src/helpers/dataUtils.js");
      vi.doUnmock("../../src/helpers/constants.js");
    });

    it("shifts focus between stat list and next prompt", async () => {
      const { emitBattleEvent } = await loadBattleCLI();
      emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
      expect(document.activeElement?.id).toBe("cli-stats");
      const { setAutoContinue } = await import(
        "../../src/helpers/classicBattle/orchestratorHandlers.js"
      );
      setAutoContinue(false);
      emitBattleEvent("battleStateChange", { to: "roundOver" });
      const bar = document.querySelector("#snackbar-container .snackbar");
      expect(bar?.textContent).toBe("Press Enter to continue");
      expect(document.activeElement).toBe(bar);
    });

    it("navigates stat rows with arrow keys and wraps", async () => {
      const { __test } = await loadBattleCLI(["speed", "power", "technique"]);
      await __test.renderStatList({
        stats: { speed: 1, power: 2, technique: 3 }
      });
      const list = document.getElementById("cli-stats");
      const rows = Array.from(list.querySelectorAll(".cli-stat"));
      expect(rows[0].tabIndex).toBe(0);
      expect(rows[1].tabIndex).toBe(-1);
      list.focus();
      __test.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[0]);
      __test.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[1]);
      __test.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(document.activeElement).toBe(rows[0]);
      __test.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(document.activeElement).toBe(rows[2]);
      __test.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[0]);
      expect(list.getAttribute("aria-activedescendant")).toBe(rows[0].id);
    });
  });
});
