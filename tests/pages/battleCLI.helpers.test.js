import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/helpers/classicBattle/testHooks.js", () => ({}));

let setupFlags;
let wireEvents;
let subscribeEngine;
let engineFacadeMock;
let featureFlagsMock;
let updateRoundHeaderMock;

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Battle CLI Helpers", () => {
  beforeEach(async () => {
    window.__TEST__ = true;
    let verboseFlag = false;
    featureFlagsMock = {
      initFeatureFlags: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn((flag) => {
        if (flag === "cliVerbose") return verboseFlag;
        return flag === "cliShortcuts";
      }),
      setFlag: vi.fn(async (flag, value) => {
        if (flag === "cliVerbose") {
          verboseFlag = !!value;
          featureFlagsMock.featureFlagsEmitter.dispatchEvent(
            new CustomEvent("change", { detail: { flag } })
          );
        }
        return undefined;
      }),
      featureFlagsEmitter: new EventTarget()
    };

    updateRoundHeaderMock = vi.fn();

    engineFacadeMock = {
      getPointsToWin: vi.fn(),
      setPointsToWin: vi.fn(),
      on: vi.fn()
    };

    vi.doMock("../../src/helpers/featureFlags.js", () => featureFlagsMock);
    vi.doMock("../../src/pages/battleCLI/dom.js", () => ({
      byId: (id) => document.getElementById(id),
      updateRoundHeader: updateRoundHeaderMock,
      setRoundMessage: (msg) => {
        const node = document.getElementById("round-message");
        if (node) node.textContent = msg;
      },
      updateScoreLine: vi.fn(),
      clearVerboseLog: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => engineFacadeMock);

    const { battleCLI } = await import("../../src/pages/index.js");
    battleCLI.ensureCliDomForTest({ reset: true });

    ({ setupFlags, wireEvents, subscribeEngine } = await import(
      "../../src/pages/battleCLI/init.js"
    ));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete window.__TEST__;
  });

  describe("setupFlags", () => {
    it("toggles the verbose section when the checkbox is clicked", async () => {
      await setupFlags();
      const verboseToggle = document.getElementById("verbose-toggle");
      const verboseSection = document.getElementById("cli-verbose-section");

      expect(verboseSection.hidden).toBe(true);

      verboseToggle.click();
      await flushMicrotasks();
      expect(verboseSection.hidden).toBe(false);

      verboseToggle.click();
      await flushMicrotasks();
      expect(verboseSection.hidden).toBe(true);
    });

    it("keeps the verbose UI responsive when the engine facade throws", async () => {
      engineFacadeMock.getPointsToWin.mockImplementation(() => {
        throw new Error("boom");
      });
      engineFacadeMock.setPointsToWin.mockImplementation(() => {
        throw new Error("boom");
      });
      const root = document.getElementById("cli-root");
      root.dataset.target = "7";
      root.dataset.round = "2";

      await setupFlags();
      const verboseToggle = document.getElementById("verbose-toggle");
      const verboseSection = document.getElementById("cli-verbose-section");

      expect(verboseSection.hidden).toBe(true);

      verboseToggle.click();
      await flushMicrotasks();

      expect(engineFacadeMock.setPointsToWin).not.toHaveBeenCalled();
      expect(verboseSection.hidden).toBe(false);
      const lastCall = updateRoundHeaderMock.mock.calls.at(-1);
      expect(lastCall).toEqual([2, 7]);
    });

    it("toggles the verbose UI when the engine facade is unavailable", async () => {
      engineFacadeMock.getPointsToWin = undefined;
      engineFacadeMock.setPointsToWin = undefined;

      await setupFlags();
      const verboseToggle = document.getElementById("verbose-toggle");
      const verboseSection = document.getElementById("cli-verbose-section");

      expect(verboseSection.hidden).toBe(true);

      verboseToggle.click();
      await flushMicrotasks();

      expect(verboseSection.hidden).toBe(false);
    });
  });

  describe("wireEvents", () => {
    it("toggles the help section when the 'h' key is pressed", async () => {
      await setupFlags();
      wireEvents();
      const shortcutsSection = document.getElementById("cli-shortcuts");
      expect(shortcutsSection.hidden).toBe(true);

      const keydownEvent = new KeyboardEvent("keydown", { key: "h" });
      window.dispatchEvent(keydownEvent);

      expect(shortcutsSection.hidden).toBe(false);
    });
  });

  describe("subscribeEngine", () => {
    it("updates the timer display on a timerTick engine event", async () => {
      await setupFlags();
      subscribeEngine();

      const timerTickCallback = engineFacadeMock.on.mock.calls.find(
        (call) => call[0] === "timerTick"
      )[1];
      const countdownDisplay = document.getElementById("cli-countdown");
      expect(countdownDisplay.textContent).toBe("");

      timerTickCallback({ remaining: 5, phase: "round" });

      expect(countdownDisplay.textContent).toBe("Time remaining: 5");
    });

    it("displays the match ended message on a matchEnded engine event", async () => {
      await setupFlags();
      subscribeEngine();

      const matchEndedCallback = engineFacadeMock.on.mock.calls.find(
        (call) => call[0] === "matchEnded"
      )[1];
      const roundMessage = document.getElementById("round-message");
      expect(roundMessage.textContent).toBe("");

      matchEndedCallback({ outcome: "playerWin" });

      expect(roundMessage.textContent).toContain("Match over: playerWin");
    });
  });
});
