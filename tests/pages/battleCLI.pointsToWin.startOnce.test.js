import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  const autoSelectStat = vi.fn();
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
    isEnabled: vi.fn().mockReturnValue(false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn().mockResolvedValue()
  }));
  let machine;
  let initCount = 0;
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn(() => {
      initCount++;
      return new Promise((resolve) => {
        setTimeout(() => {
          machine = {
            allowStart: initCount > 1,
            dispatch: vi.fn((evt) => {
              if (evt === "startClicked") {
                if (machine.allowStart) {
                  emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
                } else {
                  machine.allowStart = true;
                }
              }
            })
          };
          debugHooks.exposeDebugState("getClassicBattleMachine", () => machine);
          resolve();
        }, 0);
      });
    })
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent,
    emitBattleEvent
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(() => 5),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({ autoSelectStat }));
  const mod = await import("../../src/pages/battleCLI.js");
  await mod.__test.init();
  return { autoSelectStat, emitBattleEvent };
}

describe("battleCLI points to win start", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <main id="cli-main"></main>
      <div id="cli-countdown"></div>
      <div id="cli-stats"></div>
      <div id="cli-help"></div>
      <select id="points-select">
        <option value="5">5</option>
        <option value="10">10</option>
      </select>
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
      <div id="snackbar-container"></div>
    `;
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
    vi.doUnmock("../../src/helpers/classicBattle/autoSelectStat.js");
  });

  it("starts countdown after changing points to win and clicking start once", async () => {
    const { emitBattleEvent } = await loadBattleCLI();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const select = document.getElementById("points-select");
    select.value = "10";
    select.dispatchEvent(new Event("change"));
    const btn = await new Promise((resolve) => {
      const existing = document.getElementById("start-match-button");
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const el = document.getElementById("start-match-button");
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    expect(btn).toBeTruthy();
    btn.click();
    expect(emitBattleEvent).toHaveBeenCalledWith("battleStateChange", {
      to: "waitingForPlayerAction"
    });
    confirmSpy.mockRestore();
  });
});
