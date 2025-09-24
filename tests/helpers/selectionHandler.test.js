import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn(() => 1)
}));

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn(async (eventName) => {
    if (eventName === "statSelected") {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  })
}));

vi.mock("../../src/helpers/classicBattle/timerUtils.js", () => ({
  resolveDelay: vi.fn(() => 0)
}));

vi.mock("../../src/helpers/classicBattle/promises.js", () => ({
  getRoundResolvedPromise: vi.fn(() => new Promise(() => {}))
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/i18n.js", () => ({
  t: vi.fn((k) => k)
}));

import { handleStatSelection } from "../../src/helpers/classicBattle.js";
import { cleanupTimers } from "../../src/helpers/classicBattle/selectionHandler.js";
import { setFlag } from "../../src/helpers/featureFlags.js";

describe("handleStatSelection helpers", () => {
  let store;
  let stopTimer;
  let emitBattleEvent;
  let showSnackbar;
  let dispatchBattleEvent;
  let getBattleState;
  let timers;

  beforeEach(async () => {
    timers = useCanonicalTimers();
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    ({ stopTimer } = await import("../../src/helpers/battleEngineFacade.js"));
    ({ emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js"));
    ({ showSnackbar } = await import("../../src/helpers/showSnackbar.js"));
    ({ dispatchBattleEvent } = await import("../../src/helpers/classicBattle/eventDispatcher.js"));
    ({ getBattleState } = await import("../../src/helpers/classicBattle/eventBus.js"));
    getBattleState.mockReturnValue(null);
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("ignores repeated selections", async () => {
    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await handleStatSelection(store, "speed", { playerVal: 3, opponentVal: 4 });

    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenCalledTimes(2);
    expect(emitBattleEvent).toHaveBeenNthCalledWith(2, "input.ignored", {
      kind: "duplicateSelection"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledWith("roundResolved");
    expect(store.selectionMade).toBe(true);
  });

  it("applies test-mode shortcuts", async () => {
    document.body.innerHTML = `
      <div id="next-round-timer">123</div>
      <div id="round-message">hi</div>
    `;

    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(document.body);

    // Mock dispatchBattleEvent to return false so direct resolution is used
    dispatchBattleEvent.mockResolvedValueOnce(false);

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(document.getElementById("next-round-timer").textContent).toBe("");
    expect(document.getElementById("round-message").textContent).toBe("");
    expect(showSnackbar).toHaveBeenCalledWith("ui.opponentChoosing");
  });

  it("clears autoSelectId even when feature flag disabled", async () => {
    // Use fake timer instead of real setTimeout
    const timeout = vi.fn();
    const timerId = setTimeout(timeout, 1000);
    store.autoSelectId = timerId;

    await setFlag("autoSelect", false);
    const spy = vi.spyOn(global, "clearTimeout");
    cleanupTimers(store);

    expect(spy).toHaveBeenCalledWith(timerId);
    expect(store.autoSelectId).toBeNull();
    spy.mockRestore();
  });

  it("should not call resolveRoundDirect when orchestrator handles the event", async () => {
    const { resolveRound } = await import("../../src/helpers/classicBattle/roundResolver.js");
    dispatchBattleEvent.mockResolvedValue(true); // Simulate orchestrator handling it

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchBattleEvent).toHaveBeenCalledWith("statSelected");
    expect(resolveRound).not.toHaveBeenCalled();
  });

  it("should call resolveRoundDirect when orchestrator does not handle the event", async () => {
    const { resolveRound } = await import("../../src/helpers/classicBattle/roundResolver.js");
    dispatchBattleEvent.mockResolvedValue(false); // Simulate orchestrator not handling it

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchBattleEvent).toHaveBeenCalledWith("statSelected");
    expect(resolveRound).toHaveBeenCalled();
  });

  it("passes zero delay to resolveRoundDirect during orchestrator fallback", async () => {
    document.body.dataset.battleState = "active";
    store.orchestrator = {};
    getBattleState.mockReturnValue("roundDecision");
    dispatchBattleEvent.mockResolvedValue(false);

    const timerUtils = await import("../../src/helpers/classicBattle/timerUtils.js");
    const resolver = await import("../../src/helpers/classicBattle/roundResolver.js");

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await vi.runAllTimersAsync();

    expect(resolver.resolveRound).toHaveBeenCalledWith(
      store,
      "power",
      1,
      2,
      expect.objectContaining({ delayMs: 0 })
    );
    expect(timerUtils.resolveDelay).toHaveBeenCalledTimes(1);

    delete document.body.dataset.battleState;
    getBattleState.mockReturnValue(null);
  });
});
