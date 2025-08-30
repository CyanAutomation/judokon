import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn(() => false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(() => 10)
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  await mod.__test.init();
  return mod.__test;
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
      window.__getClassicBattleMachine = vi.fn(() => machine);
    });

    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = "";
      delete window.__TEST__;
      delete window.__getClassicBattleMachine;
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
      await loadBattleCLI();
      document.dispatchEvent(
        new CustomEvent("battle:state", { detail: { to: "waitingForPlayerAction" } })
      );
      expect(document.activeElement?.id).toBe("cli-stats");
      document.dispatchEvent(new CustomEvent("battle:state", { detail: { to: "roundOver" } }));
      const bar = document.querySelector("#snackbar-container .snackbar");
      expect(bar?.textContent).toBe("Press Enter to continue");
      expect(document.activeElement).toBe(bar);
    });
  });
});
