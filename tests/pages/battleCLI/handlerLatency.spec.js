import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";
import cliState from "../../../src/pages/battleCLI/state.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";

const baseOptions = {
  battleStats: ["speed", "strength"],
  stats: [
    { statIndex: 1, name: "Speed" },
    { statIndex: 2, name: "Strength" }
  ],
  html: '<div id="player-card"></div>'
};

async function setupWaitingForAction() {
  const mod = await loadBattleCLI(baseOptions);
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

describe("battleCLI waitingForPlayerAction handler latency", () => {
  let battleCliLoaded = false;

  beforeEach(() => {
    resetCliState();
  });
  afterEach(async () => {
    resetCliState();
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
    expect(document.activeElement).toBe(statEl);

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });

    onKeyDown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(cliState.roundResolving).toBe(false);
    expect(statEl.classList.contains("selected")).toBe(false);

    await Promise.resolve();

    expect(cliState.roundResolving).toBe(true);
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("emits statSelected using the dataset stat key", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    statEl.dataset.stat = "speed";
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEvents.emitBattleEvent;
    emitSpy.mockClear?.();

    onKeyDown(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );

    await Promise.resolve();

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

    onKeyDown(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: fallbackStat });
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("defers numeric key selection via onKeyDown microtask scheduling", async () => {
    document.body.innerHTML = "";
    const mod = await loadBattleCLI({
      autoSelect: false,
      battleStats: ["power", "speed"],
      stats: [
        { statIndex: 1, name: "Power" },
        { statIndex: 2, name: "Speed" }
      ]
    });
    const runtimeInit = await import("../../../src/pages/battleCLI/init.js");
    const { default: runtimeState } = await import("../../../src/pages/battleCLI/state.js");
    battleCliLoaded = true;
    await mod.init();

    const statEl = document.querySelector('[data-stat-index="1"]');
    expect(statEl).toBeTruthy();

    const roundResolvingDescriptor = Object.getOwnPropertyDescriptor(
      runtimeState,
      "roundResolving"
    );
    let roundResolvingValue =
      typeof roundResolvingDescriptor?.get === "function"
        ? runtimeState.roundResolving
        : roundResolvingDescriptor?.value ?? false;
    const roundResolvingSpy = vi.fn();
    Object.defineProperty(runtimeState, "roundResolving", {
      configurable: true,
      enumerable: true,
      get: () => roundResolvingValue,
      set: (value) => {
        roundResolvingValue = value;
        roundResolvingSpy(value);
      }
    });

    const resetRuntimeState = () => {
      runtimeState.ignoreNextAdvanceClick = false;
      runtimeState.shortcutsReturnFocus = null;
      runtimeState.shortcutsOverlay = null;
      runtimeState.escapeHandledPromise = new Promise((resolve) => {
        runtimeState.escapeHandledResolve = resolve;
      });
      runtimeState.roundResolving = false;
    };

    const scheduledTasks = [];
    let captureNext = false;
    const scheduleSpy = vi.spyOn(runtimeInit, "__scheduleMicrotask");
    const originalPromiseResolve = Promise.resolve.bind(Promise);
    const promiseSpy = vi.spyOn(Promise, "resolve");
    promiseSpy.mockImplementation((value) => {
      if (captureNext) {
        captureNext = false;
        return {
          then(fn) {
            scheduledTasks.push(fn);
            return originalPromiseResolve(value);
          },
          catch(onRejected) {
            return originalPromiseResolve(value).catch(onRejected);
          },
          finally(onFinally) {
            return originalPromiseResolve(value).finally(onFinally);
          }
        };
      }
      return originalPromiseResolve(value);
    });
    const takeNextScheduledTask = () => scheduledTasks.shift();

    captureNext = true;
    const sanityResult = runtimeInit.handleWaitingForPlayerActionKey("1");
    expect(sanityResult).toBe(true);
    const sanityTask = takeNextScheduledTask();
    expect(typeof sanityTask).toBe("function");
    await sanityTask?.();
    await Promise.resolve();
    expect(roundResolvingSpy.mock.calls.some(([value]) => value === true)).toBe(true);
    resetRuntimeState();
    roundResolvingSpy.mockClear();
    roundResolvingValue = runtimeState.roundResolving;
    scheduledTasks.length = 0;
    captureNext = false;
    scheduleSpy.mockClear();
    statEl.classList.remove("selected");
    statEl.setAttribute("aria-selected", "false");
    document.getElementById("cli-stats")?.removeAttribute("data-selected-index");
    document.querySelector("#snackbar-container .snackbar")?.remove();

    const { onKeyDown } = await import("../../../src/pages/index.js");
    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    battleEventsMod.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    if (document.body.dataset.battleState !== "waitingForPlayerAction") {
      document.body.dataset.battleState = "waitingForPlayerAction";
    }
    mod.startSelectionCountdown(30);
    expect(countdown?.dataset.remainingTime).toBe("30");
    expect(runtimeState.roundResolving).toBe(false);

    const { isEnabled } = await import("../../../src/helpers/featureFlags.js");
    expect(isEnabled("cliShortcuts")).toBe(true);
    expect(isEnabled("statHotkeys")).toBe(true);

    captureNext = true;
    onKeyDown(new KeyboardEvent("keydown", { key: "1" }));
    const scheduledTask = takeNextScheduledTask();
    expect(typeof scheduledTask).toBe("function");
    expect(String(scheduledTask)).toContain("selectStat");
    expect(statEl.classList.contains("selected")).toBe(false);
    expect(countdown?.dataset.status).toBeUndefined();
    const snackbarBefore = document.querySelector("#snackbar-container .snackbar");
    expect(snackbarBefore?.textContent ?? "").not.toContain("You Picked:");

    await scheduledTask?.();
    const postSelectionCalls = roundResolvingSpy.mock.calls.map(([value]) => value);
    const toggledTrue = postSelectionCalls.some((value) => value === true);
    await Promise.resolve();
    const roundResolvingCalls = roundResolvingSpy.mock.calls.map(([value]) => value);
    expect(toggledTrue).toBe(true);

    const emittedTypes = emitSpy.mock.calls.map(([type]) => type);
    expect(emittedTypes).toContain("statSelected");
    expect(emittedTypes).not.toContain("roundResolved");

    expect(statEl.classList.contains("selected")).toBe(true);
    expect(roundResolvingCalls).toContain(true);
    const snackbar = document.querySelector("#snackbar-container .snackbar");
    expect(snackbar?.textContent).toBe("You Picked: Power");
    expect(countdown?.dataset.status).toBeUndefined();
    expect(countdown?.textContent || "").not.toContain("Invalid key");

    if (roundResolvingDescriptor) {
      Object.defineProperty(runtimeState, "roundResolving", roundResolvingDescriptor);
      if ("value" in roundResolvingDescriptor) {
        runtimeState.roundResolving = roundResolvingDescriptor.value;
      }
    }
    resetRuntimeState();
    promiseSpy.mockRestore();
    scheduleSpy.mockRestore();
  });
});
