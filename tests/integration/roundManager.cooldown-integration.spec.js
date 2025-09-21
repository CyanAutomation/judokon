import { expect, test, vi } from "vitest";
import {
  createBattleStore,
  startCooldown,
  _resetForTest
} from "../../src/helpers/classicBattle/roundManager.js";
import * as eventDispatcher from "../../src/helpers/classicBattle/eventDispatcher.js";

function createScoreboardStub() {
  return {
    clearTimer: vi.fn(),
    showMessage: vi.fn(),
    showAutoSelect: vi.fn(),
    showTemporaryMessage: vi.fn(() => vi.fn()),
    updateTimer: vi.fn(),
    updateRoundCounter: vi.fn(),
    clearRoundCounter: vi.fn()
  };
}

function createSnackbarStub() {
  return {
    showSnackbar: vi.fn(),
    updateSnackbar: vi.fn()
  };
}

test("integration: startCooldown drives readiness flow with fake timers", async () => {
  const timers = vi.useFakeTimers();
  const store = createBattleStore();
  const dispatchSpy = vi.spyOn(eventDispatcher, "dispatchBattleEvent").mockResolvedValue(true);

  const previousDebugMap = window.__classicBattleDebugMap;
  const previousStartCount = globalThis.__startCooldownCount;
  const previousInvoked = window.__startCooldownInvoked;
  const previousCooldownOverride = window.__NEXT_ROUND_COOLDOWN_MS;

  window.__classicBattleDebugMap = new Map();
  globalThis.__startCooldownCount = 0;
  window.__startCooldownInvoked = false;
  window.__NEXT_ROUND_COOLDOWN_MS = 1000;

  document.body.innerHTML = "";
  delete document.body.dataset?.battleState;

  try {
    _resetForTest(store);

    document.body.innerHTML =
      '<button id="next-button" data-role="next-round" disabled data-next-ready="false"></button>';
    delete document.body.dataset?.battleState;

    const controls = startCooldown(store, undefined, {
      scoreboard: createScoreboardStub(),
      showSnackbar: createSnackbarStub(),
      updateDebugPanel: vi.fn(),
      getStateSnapshot: () => ({ state: "cooldown", log: [] })
    });

    expect(controls).toBeTruthy();
    expect(window.__startCooldownInvoked).toBe(true);
    expect(globalThis.__startCooldownCount).toBe(1);

    const nextButton = document.getElementById("next-button");
    expect(nextButton?.disabled).toBe(false);
    expect(nextButton?.getAttribute("data-next-ready")).toBe("true");

    const initialTrace = globalThis.__classicBattleDebugRead?.("nextRoundReadyTrace") ?? [];
    expect(Array.isArray(initialTrace)).toBe(true);
    expect(initialTrace.some((entry) => entry.event === "startCooldown")).toBe(true);
    expect(initialTrace.some((entry) => entry.event === "controlsCreated")).toBe(true);

    const readyPromise = controls.ready;
    await vi.runAllTimersAsync();
    await expect(readyPromise).resolves.toBeUndefined();

    expect(dispatchSpy).toHaveBeenCalledWith("ready");

    const finalTrace = globalThis.__classicBattleDebugRead?.("nextRoundReadyTrace") ?? [];
    const traceEvents = finalTrace.map((entry) => entry.event);
    expect(traceEvents).toContain("handleNextRoundExpiration.start");
    expect(traceEvents).toContain("handleNextRoundExpiration.dispatched");
    expect(traceEvents).toContain("handleNextRoundExpiration.end");
  } finally {
    timers.useRealTimers();
    dispatchSpy.mockRestore();
    document.body.innerHTML = "";
    try {
      _resetForTest(store);
    } catch {}
    if (typeof previousCooldownOverride === "undefined") {
      delete window.__NEXT_ROUND_COOLDOWN_MS;
    } else {
      window.__NEXT_ROUND_COOLDOWN_MS = previousCooldownOverride;
    }
    if (typeof previousDebugMap === "undefined") {
      delete window.__classicBattleDebugMap;
    } else {
      window.__classicBattleDebugMap = previousDebugMap;
    }
    if (typeof previousStartCount === "undefined") {
      delete globalThis.__startCooldownCount;
    } else {
      globalThis.__startCooldownCount = previousStartCount;
    }
    if (typeof previousInvoked === "undefined") {
      delete window.__startCooldownInvoked;
    } else {
      window.__startCooldownInvoked = previousInvoked;
    }
  }
});
