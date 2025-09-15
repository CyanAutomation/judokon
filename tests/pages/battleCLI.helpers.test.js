import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupFlags, wireEvents, subscribeEngine } from "../../src/pages/battleCLI/init.js";
import * as battleEngineFacade from "../../src/helpers/battleEngineFacade.js";

describe("Battle CLI Helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="verbose-toggle" type="checkbox" />
      <section id="cli-verbose-section" hidden></section>
      <section id="cli-shortcuts" hidden><button id="cli-shortcuts-close"></button></section>
      <div id="cli-countdown"></div>
      <div id="round-message"></div>
      <div id="cli-root"></div>
    `;
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn(() => true), // Enable cliShortcuts
      setFlag: vi.fn().mockResolvedValue(undefined),
      featureFlagsEmitter: new EventTarget(),
    }));
    vi.doMock("../../src/pages/battleCLI/dom.js", () => ({
      byId: (id) => document.getElementById(id),
      updateRoundHeader: vi.fn(),
      setRoundMessage: (msg) => {
        document.getElementById("round-message").textContent = msg;
      },
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("setupFlags", () => {
    it("toggles the verbose section when the checkbox is clicked", async () => {
      vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
        getPointsToWin: vi.fn(),
        setPointsToWin: vi.fn(),
      }));
      await setupFlags();
      const verboseToggle = document.getElementById("verbose-toggle");
      const verboseSection = document.getElementById("cli-verbose-section");

      expect(verboseSection.hidden).toBe(true);

      verboseToggle.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(verboseSection.hidden).toBe(false);

      verboseToggle.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(verboseSection.hidden).toBe(true);
    });
  });

  describe("wireEvents", () => {
    it("toggles the help section when the 'h' key is pressed", () => {
      wireEvents();
      const shortcutsSection = document.getElementById("cli-shortcuts");
      expect(shortcutsSection.hidden).toBe(true);

      const keydownEvent = new KeyboardEvent("keydown", { key: "h" });
      window.dispatchEvent(keydownEvent);

      expect(shortcutsSection.hidden).toBe(false);
    });
  });

  describe("subscribeEngine", () => {
    it("updates the timer display on a timerTick engine event", () => {
      const onSpy = vi.spyOn(battleEngineFacade, "on");
      subscribeEngine();

      const timerTickCallback = onSpy.mock.calls.find(call => call[0] === 'timerTick')[1];
      const countdownDisplay = document.getElementById("cli-countdown");
      expect(countdownDisplay.textContent).toBe("");

      timerTickCallback({ remaining: 5, phase: "round" });

      expect(countdownDisplay.textContent).toBe("Time remaining: 5");
    });

    it("displays the match ended message on a matchEnded engine event", () => {
      const onSpy = vi.spyOn(battleEngineFacade, "on");
      subscribeEngine();

      const matchEndedCallback = onSpy.mock.calls.find(call => call[0] === 'matchEnded')[1];
      const roundMessage = document.getElementById("round-message");
      expect(roundMessage.textContent).toBe("");

      matchEndedCallback({ outcome: "playerWin" });

      expect(roundMessage.textContent).toContain("Match over: playerWin");
    });
  });
});
