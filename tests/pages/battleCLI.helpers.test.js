import { describe, it, expect, afterEach, vi } from "vitest";

import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

function createEngineStub({ pointsToWin = 10, scores } = {}) {
  const bus = new EventTarget();
  let target = pointsToWin;
  const resolvedScores =
    scores ||
    (() => ({
      playerScore: 0,
      opponentScore: 0
    }));
  return {
    on: vi.fn((eventName, handler) => {
      bus.addEventListener(eventName, (event) => handler(event.detail));
    }),
    emit(eventName, detail) {
      bus.dispatchEvent(new CustomEvent(eventName, { detail }));
    },
    setPointsToWin: vi.fn((value) => {
      target = value;
      return undefined;
    }),
    getPointsToWin: vi.fn(() => target),
    getScores: vi.fn(() =>
      typeof resolvedScores === "function" ? resolvedScores() : resolvedScores
    ),
    stopTimer: vi.fn(),
    getEngine: vi.fn(() => null)
  };
}

function mockEngineFacade(overrides) {
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: overrides.setPointsToWin,
    getPointsToWin: overrides.getPointsToWin,
    getScores: overrides.getScores,
    stopTimer: overrides.stopTimer,
    on: overrides.on,
    emit: overrides.emit,
    getEngine: overrides.getEngine
  }));
}

describe("Battle CLI helpers", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  describe("setupFlags", () => {
    it("reveals verbose UI when the checkbox is toggled", async () => {
      const mod = await loadBattleCLI({ verbose: false });
      await mod.init();

      const checkbox = document.getElementById("verbose-toggle");
      const section = document.getElementById("cli-verbose-section");
      const log = document.getElementById("cli-verbose-log");
      const header = document.getElementById("cli-round");

      expect(section.hidden).toBe(true);
      expect(section.getAttribute("aria-expanded")).toBe("false");
      const initialHeader = header.textContent;

      checkbox.click();
      await Promise.resolve();

      expect(section.hidden).toBe(false);
      expect(section.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(log);
      expect(header.textContent).toBe(initialHeader);

      checkbox.click();
      await Promise.resolve();

      expect(section.hidden).toBe(true);
      expect(section.getAttribute("aria-expanded")).toBe("false");
    });

    it("restores the previous header when engine facade calls fail", async () => {
      const engineStub = createEngineStub({ pointsToWin: 11 });
      let failCalls = false;
      engineStub.getPointsToWin.mockImplementation(() => {
        if (failCalls) {
          throw new Error("boom");
        }
        return 11;
      });
      engineStub.setPointsToWin.mockImplementation(() => {
        if (failCalls) {
          throw new Error("boom");
        }
        return undefined;
      });
      mockEngineFacade(engineStub);

      const mod = await loadBattleCLI({ mockBattleEngine: false, verbose: false });
      await mod.init();
      failCalls = true;

      const root = document.getElementById("cli-root");
      root.dataset.round = "2";
      root.dataset.target = "7";
      const checkbox = document.getElementById("verbose-toggle");
      const section = document.getElementById("cli-verbose-section");

      checkbox.click();
      await Promise.resolve();

      expect(section.hidden).toBe(false);
      const header = document.getElementById("cli-round");
      expect(header.textContent).toBe("Round 2 Target: 7");
    });

    it("toggles verbose UI when the engine facade is unavailable", async () => {
      const engineStub = {
        on: undefined,
        emit: undefined,
        setPointsToWin: undefined,
        getPointsToWin: undefined,
        getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
        stopTimer: vi.fn(),
        getEngine: vi.fn(() => null)
      };
      mockEngineFacade(engineStub);

      const mod = await loadBattleCLI({ mockBattleEngine: false, verbose: false });
      await mod.init();

      const checkbox = document.getElementById("verbose-toggle");
      const section = document.getElementById("cli-verbose-section");

      checkbox.click();
      await Promise.resolve();

      expect(section.hidden).toBe(false);
    });
  });

  describe("wireEvents", () => {
    it("opens and closes shortcuts when the 'h' key is pressed", async () => {
      await cleanupBattleCLI();
      const mod = await loadBattleCLI();
      const addEventSpy = vi.spyOn(window, "addEventListener");
      await mod.init();
      const keydownCall = addEventSpy.mock.calls.find(([type]) => type === "keydown");
      expect(keydownCall).toBeDefined();
      const [, boundHandler] = keydownCall;
      expect(typeof boundHandler).toBe("function");
      boundHandler(new KeyboardEvent("keydown", { key: "h" }));
      expect(document.getElementById("cli-shortcuts").open).toBe(true);
      boundHandler(new KeyboardEvent("keydown", { key: "h" }));
      expect(document.getElementById("cli-shortcuts").open).toBe(false);
      addEventSpy.mockRestore();
      const { wireEvents } = await import("../../src/pages/index.js");
      wireEvents();

      const shortcuts = document.getElementById("cli-shortcuts");
      const countdown = document.getElementById("cli-countdown");
      expect(shortcuts.tagName).toBe("DETAILS");
      expect(shortcuts.hidden).toBe(false);
      expect(shortcuts.open).toBe(false);
      expect(document.activeElement?.tagName).not.toBe("INPUT");
      document.body.dataset.battleState = "waitingForPlayerAction";
      const { isEnabled } = await import("../../src/helpers/featureFlags.js");
      expect(isEnabled("cliShortcuts")).toBe(true);
      const collapseHelper = window.__battleCLIinit?.setShortcutsCollapsed;
      expect(typeof collapseHelper === "function" || collapseHelper === undefined).toBe(true);
      const closeButton = document.getElementById("cli-shortcuts-close");

      const boundSpy = vi.fn(boundHandler);
      window.addEventListener("keydown", boundSpy);

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", bubbles: true })
      );
      await Promise.resolve();

      expect(boundSpy).toHaveBeenCalledTimes(1);
      expect(countdown.textContent).not.toBe("Invalid key, press H for help");
      expect(shortcuts.open).toBe(true);
      expect(document.activeElement).toBe(closeButton);

      boundSpy.mockClear();
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", bubbles: true })
      );
      await Promise.resolve();

      expect(boundSpy).toHaveBeenCalledTimes(1);
      expect(shortcuts.open).toBe(false);

      boundSpy.mockClear();
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", bubbles: true })
      );
      await Promise.resolve();

      expect(boundSpy).toHaveBeenCalledTimes(1);
      expect(shortcuts.open).toBe(true);

      boundSpy.mockClear();
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", bubbles: true })
      );
      await Promise.resolve();

      expect(boundSpy).toHaveBeenCalledTimes(1);
      expect(shortcuts.open).toBe(false);

      window.removeEventListener("keydown", boundSpy);
    });
  });

  describe("subscribeEngine", () => {
    it("updates countdown and match messaging when engine events fire", async () => {
      const engineStub = createEngineStub();
      mockEngineFacade(engineStub);

      const mod = await loadBattleCLI({ mockBattleEngine: false });
      await mod.init();
      const { subscribeEngine } = await import("../../src/pages/battleCLI/init.js");
      subscribeEngine();

      const countdown = document.getElementById("cli-countdown");
      const roundMessage = document.getElementById("round-message");
      const announcement = document.getElementById("match-announcement");

      expect(countdown.textContent).toBe("");
      expect(roundMessage.textContent).toBe("");
      expect(announcement.textContent).toBe("");

      engineStub.emit("timerTick", { remaining: 5, phase: "round" });
      expect(countdown.textContent).toBe("Time remaining: 5");

      engineStub.emit("matchEnded", { outcome: "playerWin" });
      expect(roundMessage.textContent).toBe("Match over: playerWin");
      expect(announcement.textContent).toBe("Match over. You win!");
    });
  });

  describe("resetMatch", () => {
    it("resets visible state synchronously", async () => {
      const engineStub = createEngineStub({ pointsToWin: 9 });
      mockEngineFacade(engineStub);

      const mod = await loadBattleCLI({ mockBattleEngine: false });
      await mod.init();

      const header = document.getElementById("cli-round");
      header.textContent = "Round 3 Target: 4";
      const score = document.getElementById("cli-score");
      score.textContent = "You: 3 Opponent: 2";
      const roundMessage = document.getElementById("round-message");
      roundMessage.textContent = "Round resolved";
      const announcement = document.getElementById("match-announcement");
      announcement.textContent = "Match over. Opponent wins.";
      const verboseLog = document.getElementById("cli-verbose-log");
      verboseLog.textContent = "Some log";

      const { resetMatch } = await import("../../src/pages/battleCLI/init.js");
      const resetPromise = resetMatch();

      expect(header.textContent).toBe("Round 0 Target: 9");
      expect(score.textContent).toBe("You: 0 Opponent: 0");
      expect(roundMessage.textContent).toBe("");
      expect(verboseLog.textContent).toBe("");
      expect(document.getElementById("cli-root").dataset.round).toBe("0");

      await resetPromise;
    });
  });
});
