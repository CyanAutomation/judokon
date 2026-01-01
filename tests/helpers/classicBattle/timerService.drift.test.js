import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTimerServiceHarness } from "../integrationHarness.js";
import { createTimerNodes, createRoundMessage, createSnackbarContainer } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createDriftStarter } from "./driftStarter.js";
import { cleanupRoundTimerMocks } from "./timerModuleCleanup.js";

const harness = createTimerServiceHarness();

beforeEach(async () => {
  await harness.setup();
});

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn(),
      updateTimer: vi.fn(),
      updateRoundCounter: vi.fn(),
      clearRoundCounter: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    const round = createDriftStarter();
    const startRound = round.starter;
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startRound };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {}, { selectionMade: false });
    round.triggerDrift(2);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    // Shared timer restarts via factory
    expect(startRound).toHaveBeenCalledTimes(2);
  });

  it("startCooldown shows fallback on drift", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/helpers/setupScoreboard.js");
    vi.doUnmock("../../../src/helpers/showSnackbar.js");
    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    const showMessage = vi.spyOn(scoreboard, "showMessage");
    const snackbar = await import("../../../src/helpers/showSnackbar.js");
    const showSnack = vi.spyOn(snackbar, "showSnackbar");
    const cool = createDriftStarter();
    const startCoolDown = cool.starter;
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown, requireEngine: () => ({ startCoolDown }) };
    });
    const driftHandlers = new Set();
    vi.doMock("../../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => ({
        on: vi.fn((event, handler) => {
          if (event === "drift") {
            driftHandlers.add(handler);
          }
          if (event === "tick") {
            handler(3);
          }
          return () => {
            if (event === "drift") {
              driftHandlers.delete(handler);
            }
          };
        }),
        off: vi.fn((event, handler) => {
          if (event === "drift") {
            driftHandlers.delete(handler);
          }
        }),
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn()
      })
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    const mod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const scheduler = createMockScheduler();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.className = "battle-header";
    document.body.appendChild(header);
    const messageEl = createRoundMessage();
    const { nextButton, nextRoundTimer } = createTimerNodes();
    createSnackbarContainer();
    header.append(messageEl, nextRoundTimer, nextButton);
    const scoreboardComponent = await import("../../../src/components/Scoreboard.js");
    scoreboardComponent.resetScoreboard();
    scoreboardComponent.initScoreboard(header);
    mod.startCooldown({}, scheduler);
    showMessage.mockClear();
    showSnack.mockClear();
    scheduler.tick(0);
    const scoreboardRegion = nextRoundTimer.closest("header");
    expect(scoreboardRegion).toBeInstanceOf(HTMLElement);
    const scoreboardHasMessage = scoreboardRegion?.contains(messageEl);
    expect(scoreboardHasMessage).toBe(true);
    expect(messageEl.textContent).toBe("");
    const triggerDrift = (remaining) => {
      for (const handler of driftHandlers) {
        handler(remaining);
      }
    };
    triggerDrift(1);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    expect(showSnack).not.toHaveBeenCalled();
    expect(messageEl.textContent).toBe("Waiting…");
    const container = document.getElementById("snackbar-container");
    expect(container).toBeInstanceOf(HTMLElement);
    const snackbarBeforeFallback = container?.querySelector(".snackbar");
    expect(snackbarBeforeFallback?.textContent).toBe("Opponent is choosing…");
    messageEl.textContent = "Round resolved";
    showSnack.mockClear();
    triggerDrift(1);
    expect(showSnack).toHaveBeenCalledWith("Waiting…");
    const activeSnackbar = container?.querySelector(".snackbar");
    expect(activeSnackbar?.textContent).toBe("Waiting…");
    if (activeSnackbar) {
      const event = new Event("animationend");
      Object.defineProperty(event, "animationName", { value: "snackbar-cycle" });
      activeSnackbar.dispatchEvent(event);
      expect(container?.querySelector(".snackbar")).toBeNull();
    }
    cleanupRoundTimerMocks();
    // Factory restarts cooldown timer on each drift (initial + 2 drifts)
    // In Vitest, fallback timer is used instead of engine
    expect(startCoolDown).toHaveBeenCalledTimes(0);
  });

  it("uses injected scheduler when starting engine cooldown", async () => {
    vi.resetModules();
    vi.stubEnv("VITEST", "");
    const scheduler = createMockScheduler();
    const { TimerController } = await import("../../../src/helpers/TimerController.js");
    const baseTimer = new TimerController();
    let capturedScheduler = null;
    let capturedContext = null;
    const engine = {
      timer: baseTimer,
      startCoolDown: vi.fn(function () {
        capturedScheduler = this.timer?.scheduler ?? null;
        capturedContext = this;
        return "started";
      }),
      emit: vi.fn(),
      matchEnded: false
    };
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, requireEngine: () => engine };
    });
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      syncScoreDisplay: vi.fn(),
      skipRoundCooldownIfEnabled: vi.fn(() => false)
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 1
    }));

    document.body.innerHTML = "";
    createTimerNodes();
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    try {
      roundMod.startCooldown({}, scheduler);
      expect(engine.startCoolDown).toHaveBeenCalledTimes(1);
      expect(capturedScheduler).toBe(scheduler);
      expect(capturedContext).toBe(engine);
      expect(engine.timer).toBe(baseTimer);
    } finally {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    }
  });
});
