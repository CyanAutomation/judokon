import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";

describe("startCooldown fallback timer", () => {
  let scheduler;
  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
      setSkipHandler: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => ({
        on: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })
    }));
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(9);
    expect(resolved).toBe(false);
    expect(btn.dataset.nextReady).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});
