import { describe, it, expect, vi } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createDriftStarter } from "./driftStarter.js";

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn(),
      updateTimer: vi.fn()
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
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn(),
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    const cool = createDriftStarter();
    const startCoolDown = cool.starter;
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown };
    });
    const mod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const scheduler = createMockScheduler();
    createTimerNodes();
    mod.startCooldown({}, scheduler);
    scheduler.tick(0);
    cool.triggerDrift(1);
    // Cooldown drift displays a non-intrusive fallback; may use snackbar
    // when a round result message is present. Accept scoreboard fallback too.
    const usedScoreboard = showMessage.mock.calls.some((c) => c[0] === "Waiting…");
    const snackbar = await import("../../../src/helpers/showSnackbar.js");
    const showSnack = vi.spyOn(snackbar, "showSnackbar");
    // Trigger another drift tick to allow snackbar path in environments
    // where the round message is present.
    cool.triggerDrift(1);
    const usedSnackbar = showSnack.mock.calls.some((c) => c[0] === "Waiting…");
    expect(usedScoreboard || usedSnackbar).toBe(true);
    // Factory restarts cooldown timer on each drift (initial + 2 drifts)
    expect(startCoolDown).toHaveBeenCalledTimes(3);
  });
});
