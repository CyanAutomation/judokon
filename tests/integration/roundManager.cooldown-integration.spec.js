import { expect, test, vi } from "vitest";
import {
  createBattleStore,
  startCooldown,
  _resetForTest
} from "../../src/helpers/classicBattle/roundManager.js";
import * as eventDispatcher from "../../src/helpers/classicBattle/eventDispatcher.js";
import {
  createGlobalStateManager,
  createScoreboardStub,
  createSnackbarStub,
  expectTraceToIncludeEvents,
  readTraceEntries,
  setupCooldownTestDOM
} from "./roundManagerTestUtils.js";

test("integration: startCooldown drives readiness flow with fake timers", async () => {
  const globalStateManager = createGlobalStateManager();
  const timers = vi.useFakeTimers();
  const store = createBattleStore();
  const dispatchSpy = vi.spyOn(eventDispatcher, "dispatchBattleEvent").mockResolvedValue(true);

  globalStateManager.setup({
    __classicBattleDebugMap: new Map(),
    __startCooldownCount: 0,
    __startCooldownInvoked: false,
    __NEXT_ROUND_COOLDOWN_MS: 1000
  });

  let disposeCooldownDOM = () => {};
  try {
    _resetForTest(store);
    disposeCooldownDOM = setupCooldownTestDOM();

    const controls = startCooldown(store, undefined, {
      scoreboard: createScoreboardStub(),
      showSnackbar: createSnackbarStub(),
      updateDebugPanel: vi.fn(),
      getStateSnapshot: () => ({ state: "roundWait", log: [] })
    });

    expect(controls).toBeTruthy();
    expect(window.__startCooldownInvoked).toBe(true);
    expect(globalThis.__startCooldownCount).toBe(1);

    const nextButton = document.getElementById("next-button");
    expect(nextButton?.disabled).toBe(false);
    expect(nextButton?.getAttribute("data-next-ready")).toBe("true");

    const initialTrace = readTraceEntries("nextRoundReadyTrace");
    expectTraceToIncludeEvents(initialTrace, ["startCooldown", "controlsCreated"]);

    const readyPromise = controls.ready;
    await vi.runAllTimersAsync();
    await expect(readyPromise).resolves.toBeUndefined();

    expect(dispatchSpy).toHaveBeenCalledWith("ready");

    const finalTrace = readTraceEntries("nextRoundReadyTrace");
    expectTraceToIncludeEvents(finalTrace, [
      "handleNextRoundExpiration.start",
      "handleNextRoundExpiration.dispatched",
      "handleNextRoundExpiration.end"
    ]);
  } finally {
    timers.useRealTimers();
    dispatchSpy.mockRestore();
    disposeCooldownDOM();
    try {
      _resetForTest(store);
    } catch {}
    globalStateManager.restore();
  }
});
