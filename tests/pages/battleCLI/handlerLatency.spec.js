import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";
import { flushMicrotasks } from "../../utils/flushMicrotasks.js";

const baseOptions = {
  battleStats: ["speed", "strength"],
  stats: [
    { statIndex: 1, name: "Speed" },
    { statIndex: 2, name: "Strength" }
  ],
  html: '<div id="player-card"></div>'
};

describe("battleCLI waitingForPlayerAction handler latency", () => {
  let battleCliLoaded = false;

  async function setupWaitingForAction() {
    const mod = await loadBattleCLI(baseOptions);
    battleCliLoaded = true;
    await mod.renderStatList();
    const list = document.getElementById("cli-stats");
    if (!list) throw new Error("Expected #cli-stats to exist after renderStatList");
    const statEl = list.querySelector(".cli-stat");
    if (!statEl) throw new Error("Expected at least one .cli-stat row to be rendered");
    statEl.focus();
    document.body.dataset.battleState = "waitingForPlayerAction";
    const { onKeyDown } = await import("../../../src/pages/index.js");
    return { mod, statEl, list, onKeyDown };
  }

  async function initNumericSelectionTest() {
    const mod = await loadBattleCLI({
      autoSelect: false,
      battleStats: ["power", "speed"],
      stats: [
        { statIndex: 1, name: "Power" },
        { statIndex: 2, name: "Speed" }
      ]
    });
    battleCliLoaded = true;
    await mod.init();
    const runtimeInit = await import("../../../src/pages/battleCLI/init.js");
    return { mod, runtimeInit };
  }

  function createMicrotaskCapture() {
    const originalResolve = Promise.resolve.bind(Promise);
    const scheduledTasks = [];
    let captureNext = false;

    const promiseSpy = vi.spyOn(Promise, "resolve").mockImplementation((value) => {
      const promise = originalResolve(value);
      if (!captureNext) {
        return promise;
      }
      return {
        then(onFulfilled, onRejected) {
          if (typeof onFulfilled === "function") {
            scheduledTasks.push(onFulfilled);
            captureNext = false;
          }
          return promise.then(onFulfilled, onRejected);
        },
        catch(onRejected) {
          return promise.catch(onRejected);
        },
        finally(onFinally) {
          return promise.finally(onFinally);
        }
      };
    });

    return {
      promiseSpy,
      scheduledTasks,
      setCaptureNext(value) {
        captureNext = value;
      }
    };
  }

  beforeEach(async () => {
    await resetCliState();
  });
  afterEach(async () => {
    await resetCliState();
    delete document.activeElement;
    if (battleCliLoaded) {
      await cleanupBattleCLI();
      battleCliLoaded = false;
    }
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("defers round resolution work for Enter on the focused stat", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();

    // Import cliState AFTER setup to get the correct instance
    const { default: cliState } = await import("../../../src/pages/battleCLI/state.js");

    expect(document.activeElement).toBe(statEl);

    // Verify the stat element has the required attributes
    const hasStat = !!statEl.dataset.stat;
    const hasStatIndex = !!statEl.dataset.statIndex;
    if (!hasStat && !hasStatIndex) {
      throw new Error("Stat element missing both dataset.stat and dataset.statIndex");
    }

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });

    onKeyDown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(cliState.roundResolving).toBe(false);
    expect(statEl.classList.contains("selected")).toBe(false);

    // Flush microtasks to allow the scheduled selectStat() to execute
    await flushMicrotasks(2);

    expect(cliState.roundResolving).toBe(true);
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("emits statSelected using the dataset stat key", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    statEl.dataset.stat = "speed";
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEvents.emitBattleEvent;
    emitSpy.mockClear?.();

    onKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

    // Flush microtasks to allow the scheduled selectStat() to execute
    await flushMicrotasks(2);

    expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: "speed" });
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("falls back to statIndex when dataset.stat is empty", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    const initMod = await import("../../../src/pages/battleCLI/init.js");
    const fallbackStat = initMod.getStatByIndex("1");
    expect(fallbackStat).toBeTruthy();
    statEl.dataset.stat = "";
    statEl.dataset.statIndex = "1";
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEvents.emitBattleEvent;
    emitSpy.mockClear?.();

    onKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

    // Flush microtasks to allow the scheduled selectStat() to execute
    await flushMicrotasks(2);

    expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: fallbackStat });
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("defers numeric key handling through handleWaitingForPlayerActionKey", async () => {
    const { mod, runtimeInit } = await initNumericSelectionTest();
    // Import cliState AFTER setup to get the correct instance
    const { default: cliState } = await import("../../../src/pages/battleCLI/state.js");

    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEventsMod.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    const emitSpy = battleEventsMod.emitBattleEvent;
    emitSpy.mockClear?.();
    await mod.renderStatList?.();
    mod.startSelectionCountdown(30);
    document.body.dataset.battleState = "waitingForPlayerAction";
    const features = await import("../../../src/helpers/featureFlags.js");
    expect(features.isEnabled("statHotkeys")).toBe(true);
    expect(runtimeInit.getStatByIndex("1")).toBe("power");
    const statEl = document.querySelector('[data-stat-index="1"]');
    expect(statEl).toBeTruthy();
    expect(cliState.roundResolving).toBe(false);

    const { promiseSpy, scheduledTasks, setCaptureNext } = createMicrotaskCapture();
    try {
      setCaptureNext(true);
      const handled = runtimeInit.handleWaitingForPlayerActionKey("1");

      expect(handled).toBe(true);
      const scheduledTask = scheduledTasks.shift();
      expect(typeof scheduledTask).toBe("function");
      expect(cliState.roundResolving).toBe(false);
      expect(statEl?.classList.contains("selected")).toBe(false);

      await scheduledTask?.();
      await Promise.resolve();

      expect(statEl?.classList.contains("selected")).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: "power" });
    } finally {
      promiseSpy.mockRestore();
    }
  });

  it("delays DOM updates until the numeric selection microtask runs", async () => {
    const { mod } = await initNumericSelectionTest();
    // Import cliState AFTER setup to get the correct instance
    const { default: cliState } = await import("../../../src/pages/battleCLI/state.js");

    const { onKeyDown } = await import("../../../src/pages/index.js");
    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEventsMod.emitBattleEvent;

    battleEventsMod.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    emitSpy.mockClear?.();
    mod.startSelectionCountdown(30);
    document.body.dataset.battleState = "waitingForPlayerAction";
    const features = await import("../../../src/helpers/featureFlags.js");
    expect(features.isEnabled("statHotkeys")).toBe(true);

    const statEl = document.querySelector('[data-stat-index="1"]');
    const countdown = document.getElementById("cli-countdown");
    expect(statEl).toBeTruthy();
    expect(countdown).toBeTruthy();
    expect(statEl?.classList.contains("selected")).toBe(false);
    expect(cliState.roundResolving).toBe(false);

    // Import the mocked showSnackbar to verify calls
    const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

    const { promiseSpy, scheduledTasks, setCaptureNext } = createMicrotaskCapture();
    try {
      setCaptureNext(true);
      onKeyDown(new KeyboardEvent("keydown", { key: "1", bubbles: true, cancelable: true }));

      const scheduledTask = scheduledTasks.shift();
      expect(typeof scheduledTask).toBe("function");
      expect(statEl?.classList.contains("selected")).toBe(false);
      expect(cliState.roundResolving).toBe(false);

      await scheduledTask?.();
      await Promise.resolve();

      expect(statEl?.classList.contains("selected")).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: "power" });

      // Verify showSnackbar was called with the correct message (snackbar is mocked in loadBattleCLI)
      expect(showSnackbar).toHaveBeenCalledWith("You Picked: Power");
      expect(countdown?.dataset.status).toBeUndefined();
    } finally {
      promiseSpy.mockRestore();
    }
  });
});
