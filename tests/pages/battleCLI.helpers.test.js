import { describe, it, expect, afterEach, vi } from "vitest";

import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

function createEngineStub({ pointsToWin = 10, scores } = {}) {
  const bus = new EventTarget();
  let target = pointsToWin;
  const resolvedScores = scores || {
    playerScore: 0,
    opponentScore: 0
  };
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
    getScores: vi.fn(() => resolvedScores),
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

      const { updateRoundHeader } = await import("../../src/pages/battleCLI/dom.js");
      updateRoundHeader(2, 7);
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
    it("registers a global keydown listener", async () => {
      await cleanupBattleCLI();
      const mod = await loadBattleCLI();
      const addEventSpy = vi.spyOn(window, "addEventListener");
      await mod.init();

      const keydownRegistrations = addEventSpy.mock.calls.filter(([type]) => type === "keydown");
      expect(keydownRegistrations.length).toBeGreaterThan(0);
      keydownRegistrations.forEach(([, handler]) => {
        expect(typeof handler).toBe("function");
      });

      addEventSpy.mockRestore();
    });

    it("toggles the shortcuts overlay when H is pressed", async () => {
      await cleanupBattleCLI();
      const mod = await loadBattleCLI();
      await mod.init();
      const { wireEvents } = await import("../../src/pages/battleCLI/init.js");
      wireEvents();

      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitBattleEvent("battleStateChange", {
        from: "roundStart",
        to: "waitingForPlayerAction"
      });

      const shortcuts = document.getElementById("cli-shortcuts");
      const countdown = document.getElementById("cli-countdown");
      const closeButton = document.getElementById("cli-shortcuts-close");

      expect(shortcuts.tagName).toBe("DETAILS");
      expect(shortcuts.open).toBe(false);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
      await Promise.resolve();

      expect(shortcuts.open).toBe(true);
      expect(document.activeElement).toBe(closeButton);
      expect(countdown.dataset.status).not.toBe("error");
      expect(countdown.textContent).not.toBe("Invalid key, press H for help");

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
      await Promise.resolve();

      expect(shortcuts.open).toBe(false);
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

      const { updateRoundHeader, setRoundMessage, updateScoreLine } = await import(
        "../../src/pages/battleCLI/dom.js"
      );
      updateRoundHeader(3, 4);
      engineStub.getScores.mockReturnValueOnce({
        playerScore: 3,
        opponentScore: 2
      });
      updateScoreLine();
      engineStub.getScores.mockReturnValue({ playerScore: 0, opponentScore: 0 });
      setRoundMessage("Round resolved");

      const { subscribeEngine } = await import("../../src/pages/battleCLI/init.js");
      subscribeEngine();
      engineStub.emit("matchEnded", { outcome: "opponentWin" });

      mod.cli.appendTranscript({ from: "roundStart", to: "Round resolved" });

      const header = document.getElementById("cli-round");
      const score = document.getElementById("cli-score");
      const roundMessage = document.getElementById("round-message");
      const announcement = document.getElementById("match-announcement");
      const verboseLog = document.getElementById("cli-verbose-log");

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
