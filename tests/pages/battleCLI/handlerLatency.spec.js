import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
// Import DOM helpers used within module under test to stub safely
import * as domMod from "../../../src/pages/battleCLI/dom.js";
import * as battleEvents from "../../../src/helpers/classicBattle/battleEvents.js";
import { withMutedConsole } from "../../utils/console.js";
import cliState from "../../../src/pages/battleCLI/state.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";

describe("battleCLI init import guards", () => {
  it("does not throw when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await expect(import("../../../src/pages/battleCLI/init.js")).resolves.toBeTruthy();
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });

  it("handles game:reset-ui dispatch when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await import("../../../src/pages/battleCLI/init.js");
        if (typeof window !== "undefined") {
          const dispatchSpy = vi.spyOn(window, "dispatchEvent");
          const testEvent = new CustomEvent("game:reset-ui", { detail: { store: null } });
          expect(() => {
            window.dispatchEvent(testEvent);
          }).not.toThrow();
          expect(dispatchSpy).toHaveBeenCalledWith(testEvent);
          dispatchSpy.mockRestore();
        }
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });
});

describe("battleCLI waitingForPlayerAction handler latency", () => {
  let battleCliLoaded = false;

  beforeEach(() => {
    document.body.innerHTML = '<div id="cli-countdown"></div>';
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

  it("returns synchronously and defers work for Enter on focused stat", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.statIndex = "1";
    list.appendChild(statDiv);
    document.body.appendChild(list);
    statDiv.tabIndex = 0;
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(cliState.roundResolving).toBe(true);
      expect(statDiv.classList.contains("selected")).toBe(true);
    } finally {
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
  });

  it("dispatches statSelected when focused stat exposes dataset key", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "speed";
    statDiv.tabIndex = 0;
    list.appendChild(statDiv);
    document.body.appendChild(list);
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });
    const getStatSpy = vi.spyOn(init, "getStatByIndex").mockImplementation(() => {
      throw new Error("fallback path should not execute when dataset.stat is provided");
    });
    const dispatchSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(dispatchSpy).toHaveBeenCalledWith("statSelected", { stat: "speed" });
    } finally {
      dispatchSpy.mockRestore();
      getStatSpy.mockRestore();
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
  });

  it("falls back to statIndex when dataset stat is empty", async () => {
    const fallbackStat = init.getStatByIndex("1");
    expect(fallbackStat).toBeTruthy();

    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "";
    statDiv.dataset.statIndex = "1";
    statDiv.tabIndex = 0;
    list.appendChild(statDiv);
    document.body.appendChild(list);
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });
    const dispatchSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(dispatchSpy).toHaveBeenCalledWith("statSelected", { stat: fallbackStat });
    } finally {
      dispatchSpy.mockRestore();
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
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
