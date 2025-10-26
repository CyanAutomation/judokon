import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreboardHeader } from "../utils/testUtils.js";
import { createMockScheduler } from "./mockScheduler.js";
import { withMutedConsole } from "../utils/console.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

describe("setupScoreboard", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    document.body.appendChild(createScoreboardHeader());
  });

  function createControls() {
    return {
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn()
    };
  }

  function createScoreboardStub(overrides = {}) {
    return {
      __esModule: true,
      initScoreboard: vi.fn(),
      showMessage: vi.fn(),
      updateScore: vi.fn(),
      clearMessage: vi.fn(),
      showTemporaryMessage: vi.fn(() => () => {}),
      clearTimer: vi.fn(),
      updateTimer: vi.fn(),
      showAutoSelect: vi.fn(),
      updateRoundCounter: vi.fn(),
      clearRoundCounter: vi.fn(),
      ...overrides
    };
  }

  async function withNonDomEnvironment(callback) {
    const originalWindow = global.window;
    const originalDocument = global.document;

    try {
      global.window = undefined;
      global.document = undefined;
      await callback();
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
    }
  }

  it("initializes scoreboard and proxies component methods", async () => {
    const scheduler = createMockScheduler();
    const controls = createControls();
    const scoreboard = await import("../../src/components/Scoreboard.js");
    const initSpy = vi.spyOn(scoreboard, "initScoreboard");
    const showSpy = vi.spyOn(scoreboard, "showMessage");
    const clearSpy = vi.spyOn(scoreboard, "clearMessage");
    const tempSpy = vi.spyOn(scoreboard, "showTemporaryMessage");
    const scoreSpy = vi.spyOn(scoreboard, "updateScore");

    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(controls, scheduler);

    expect(initSpy).toHaveBeenCalledWith(
      document.querySelector("header"),
      expect.objectContaining({ scheduler })
    );

    mod.showMessage("Hi");
    expect(showSpy).toHaveBeenCalledWith("Hi");

    mod.clearMessage();
    expect(clearSpy).toHaveBeenCalled();

    const reset = mod.showTemporaryMessage("Temp");
    expect(tempSpy).toHaveBeenCalledWith("Temp");
    expect(typeof reset).toBe("function");

    mod.updateScore(1, 2);
    expect(scoreSpy).toHaveBeenCalledWith(1, 2);
  });

  it("calls initScoreboard with null when header missing", async () => {
    document.body.innerHTML = "";
    const scheduler = createMockScheduler();
    const controls = createControls();
    const scoreboard = await import("../../src/components/Scoreboard.js");
    const initSpy = vi.spyOn(scoreboard, "initScoreboard");
    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(controls, scheduler);
    expect(initSpy).toHaveBeenCalledWith(null, expect.objectContaining({ scheduler }));
  });

  it("pauses on hide and resumes on focus", async () => {
    const scheduler = createMockScheduler();
    const controls = createControls();
    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(controls, scheduler);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(controls.pauseTimer).toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    window.dispatchEvent(new Event("focus"));
    expect(controls.resumeTimer).toHaveBeenCalledTimes(1);
  });

  it("resumes when visibility becomes visible without focus", async () => {
    const scheduler = createMockScheduler();
    const controls = createControls();
    const mod = await import("../../src/helpers/setupScoreboard.js");

    mod.setupScoreboard(controls, scheduler);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(controls.pauseTimer).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(controls.resumeTimer).toHaveBeenCalledTimes(1);
  });

  it("reuses visibility listeners when setupScoreboard runs multiple times", async () => {
    const scheduler = createMockScheduler();
    const firstControls = createControls();
    const secondControls = createControls();
    const mod = await import("../../src/helpers/setupScoreboard.js");

    mod.setupScoreboard(firstControls, scheduler);
    mod.setupScoreboard(secondControls, scheduler);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(firstControls.pauseTimer).not.toHaveBeenCalled();
    expect(secondControls.pauseTimer).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    window.dispatchEvent(new Event("focus"));
    expect(firstControls.resumeTimer).not.toHaveBeenCalled();
    expect(secondControls.resumeTimer).toHaveBeenCalledTimes(1);
  });

  it("exposes cleanup helper for visibility listeners", async () => {
    const scheduler = createMockScheduler();
    const controls = createControls();
    const mod = await import("../../src/helpers/setupScoreboard.js");

    mod.setupScoreboard(controls, scheduler);
    mod.cleanupScoreboard();

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(controls.pauseTimer).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    window.dispatchEvent(new Event("focus"));
    expect(controls.resumeTimer).not.toHaveBeenCalled();
  });

  it("logs helper failures once and falls back to noop", async () => {
    vi.resetModules();
    const stub = createScoreboardStub({
      showTemporaryMessage: vi.fn(() => {
        throw new Error("boom");
      })
    });
    vi.doMock("../../src/components/Scoreboard.js", () => stub);
    const loggerModule = await import("../../src/helpers/logger.js");
    const errorSpy = vi.spyOn(loggerModule.default, "error").mockImplementation(() => {});

    await withMutedConsole(async () => {
      const mod = await import("../../src/helpers/setupScoreboard.js");
      const restore = mod.showTemporaryMessage("Temp");
      expect(typeof restore).toBe("function");
      restore();
    });

    const scoreboard = await import("../../src/components/Scoreboard.js");
    expect(scoreboard.showTemporaryMessage).toHaveBeenCalledWith("Temp");
    expect(scoreboard.showTemporaryMessage).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[scoreboard] Helper "showTemporaryMessage" threw.',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it("skips helper execution when DOM is unavailable", async () => {
    vi.resetModules();
    const stub = createScoreboardStub();
    vi.doMock("../../src/components/Scoreboard.js", () => stub);

    await withNonDomEnvironment(async () => {
      // Simulate execution in a non-DOM environment before module import.
      await withMutedConsole(async () => {
        const mod = await import("../../src/helpers/setupScoreboard.js");
        mod.setupScoreboard(createControls());
      });

      const scoreboard = await import("../../src/components/Scoreboard.js");
      expect(scoreboard.initScoreboard).not.toHaveBeenCalled();
    });
  });
});
