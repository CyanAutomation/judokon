import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __setStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";

describe("Next button cooldown fallback", () => {
  /** @type {Array<() => void>} */
  let cleanupTasks;
  /** @type {import("../../../src/helpers/classicBattle/battleEvents.js")} */
  let battleEvents;

  beforeEach(async () => {
    cleanupTasks = [];
    battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    __setStateSnapshot({ state: null, prev: null, event: null, log: [] });
    cleanupTasks.push(() => __setStateSnapshot({ state: null, prev: null, event: null, log: [] }));
    const transitionListeners = await import(
      "../../../src/helpers/classicBattle/stateTransitionListeners.js"
    );

    document.body.innerHTML =
      '<button id="next-button" data-role="next-round" data-next-ready="false">Next</button>';

    battleEvents.__resetBattleEventTarget();
    battleEvents.onBattleEvent("battleStateChange", transitionListeners.domStateListener);
    cleanupTasks.push(() =>
      battleEvents.offBattleEvent("battleStateChange", transitionListeners.domStateListener)
    );
    cleanupTasks.push(() => battleEvents.__resetBattleEventTarget());

    battleEvents.emitBattleEvent("battleStateChange", { from: null, to: "cooldown", event: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (cleanupTasks.length) {
      const task = cleanupTasks.pop();
      try {
        task();
      } catch {}
    }
    document.body.innerHTML = "";
  });

  it("restores readiness and exits cooldown when timer controls are missing", async () => {
    const { createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );
    const store = createBattleStore();
    store.transitions = [];

    const transitionRecorder = (event) => {
      if (event?.detail) {
        store.transitions.push(event.detail);
      }
    };
    battleEvents.onBattleEvent("battleStateChange", transitionRecorder);
    cleanupTasks.push(() => battleEvents.offBattleEvent("battleStateChange", transitionRecorder));

    const { onNextButtonClick } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );
    const dispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const { markNextReady } = await import(
      "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
    );
    const { safeGetSnapshot } = await import("../../../src/helpers/classicBattle/timerUtils.js");

    expect(safeGetSnapshot().state).toBe("cooldown");

    const resolveReady = vi.fn();
    const dispatchSpy = vi
      .spyOn(dispatcher, "dispatchBattleEvent")
      .mockImplementation(async (eventName, payload) => {
        if (eventName === "ready") {
          const button = document.getElementById("next-button");
          markNextReady(button);
          battleEvents.emitBattleEvent("battleStateChange", {
            from: "cooldown",
            to: "roundStart",
            event: "ready",
            payload
          });
        }
        return true;
      });

    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });

    const nextButton = document.getElementById("next-button");
    expect(nextButton?.disabled).toBe(false);
    expect(nextButton?.getAttribute("data-next-ready")).toBe("true");
    expect(resolveReady).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");

    const lastTransition = store.transitions.at(-1);
    expect(lastTransition).toMatchObject({ from: "cooldown", to: "roundStart" });
    expect(document.body.dataset?.battleState).toBe("roundStart");
    expect(safeGetSnapshot().state).toBe("roundStart");
  });
});
