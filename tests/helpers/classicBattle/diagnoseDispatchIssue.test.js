/**
 * Diagnostic test to identify why dispatchBattleEvent("statSelected") returns false.
 * This test isolates the dispatch mechanism to understand the root cause.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";

describe("diagnoseDispatchIssue", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost/test",
      pretendToBeVisual: true,
      resources: "usable"
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    // Mock timers for deterministic test execution
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("should identify machine availability and state when dispatch is called", async () => {
    // Import and initialize battle system
    const battleMod = await import("../../../src/helpers/classicBattle.js");

    // Initialize bindings
    if (typeof battleMod.__ensureClassicBattleBindings === "function") {
      await battleMod.__ensureClassicBattleBindings({ force: true });
    }

    // Get references to test API
    const { init: initApi } = window.__TEST_API || {};
    expect(initApi).toBeTruthy();

    // Initialize battle
    const initResult = await initApi.initBattle({
      store: expect.any(Object)
    });
    expect(initResult).toBeTruthy();

    // Wait for battle to be ready
    const isReady = await initApi.waitForBattleReady(5000);
    expect(isReady).toBe(true);

    // Get initial state
    const { state: stateApi, inspect } = window.__TEST_API;
    const initialMachineState = stateApi.getState?.();
    console.log("[DIAGNOSE] Initial machine state:", initialMachineState);

    // Get machine directly
    const { readDebugState } = await import("../../../src/helpers/classicBattle/debugHooks.js");
    const machineGetter = readDebugState("getClassicBattleMachine");
    expect(machineGetter).toBeTruthy();
    const machine = typeof machineGetter === "function" ? machineGetter() : machineGetter;
    expect(machine).toBeTruthy();

    // Check initial state
    const stateBeforeRound = machine.getState?.() ?? "unknown";
    console.log("[DIAGNOSE] Machine state before round start:", stateBeforeRound);

    // Click to start a round
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);
    roundButtons[0].click();

    // Allow microtasks to process
    await Promise.resolve();

    // Check state after round click
    const stateAfterClick = machine.getState?.() ?? "unknown";
    console.log("[DIAGNOSE] Machine state after round click:", stateAfterClick);

    // Wait for waitingForPlayerAction state
    let stateAfterWait = stateAfterClick;
    try {
      await stateApi.waitForBattleState("waitingForPlayerAction", 2000);
      stateAfterWait = machine.getState?.() ?? "unknown";
      console.log("[DIAGNOSE] Machine state after waitForBattleState:", stateAfterWait);
    } catch (error) {
      console.log("[DIAGNOSE] waitForBattleState timed out. State is:", stateAfterWait);
    }

    // Check if machine can handle "statSelected" event
    const canHandle = machine.dispatch?.("statSelected") === false
      ? "NO (returns false)"
      : machine.dispatch?.("statSelected") === true
        ? "YES (returns true)"
        : "UNKNOWN";
    console.log("[DIAGNOSE] Can machine handle 'statSelected' event?", canHandle);

    // Log the state table to understand valid transitions
    const stateTable = machine.stateTable || readDebugState("stateTable");
    if (stateTable && Array.isArray(stateTable)) {
      const currentStateConfig = stateTable.find(s => s.name === stateAfterWait);
      const allowedEvents = currentStateConfig
        ? currentStateConfig.on?.map(entry => typeof entry === "string" ? entry : entry.on)
        : [];
      console.log(
        `[DIAGNOSE] State "${stateAfterWait}" allows events:`,
        allowedEvents.filter(Boolean)
      );
    }

    // Get dispatch debug info
    const dispatchDebugBefore = readDebugState("dispatchMachineStateBefore");
    const dispatchDebugAfter = readDebugState("dispatchMachineStateAfter");
    const dispatchResult = readDebugState("dispatchBattleEventResult");
    console.log("[DIAGNOSE] Last dispatch - before state:", dispatchDebugBefore);
    console.log("[DIAGNOSE] Last dispatch - after state:", dispatchDebugAfter);
    console.log("[DIAGNOSE] Last dispatch - result:", dispatchResult);

    // Summary
    expect(stateAfterWait).toBe("waitingForPlayerAction");
    expect(machine).toBeTruthy();
  });
});
