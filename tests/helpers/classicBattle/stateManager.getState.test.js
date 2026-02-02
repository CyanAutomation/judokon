import { describe, it, expect, beforeEach } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";

describe("stateManager getState() initialization and transitions", () => {
  let machine;

  beforeEach(async () => {
    // Reset between tests
    machine = null;
  });

  it("should initialize with correct initial state (waitingForMatchStart)", async () => {
    machine = await createStateManager({}, {}, undefined, CLASSIC_BATTLE_STATES);
    expect(machine).toBeDefined();
    expect(machine.getState).toBeDefined();

    const initialState = machine.getState();
    expect(initialState).toBeDefined();
    expect(initialState).not.toBeNull();
    expect(initialState).toBe("waitingForMatchStart");
  });

  it("should consistently return the same state without transitions", async () => {
    machine = await createStateManager({}, {}, undefined, CLASSIC_BATTLE_STATES);

    const state1 = machine.getState();
    const state2 = machine.getState();
    const state3 = machine.getState();

    expect(state1).toBe(state2);
    expect(state2).toBe(state3);
    expect(state1).toBe("waitingForMatchStart");
  });

  it("should transition from waitingForMatchStart to matchStart on startClicked event", async () => {
    const onTransitionSpy = [];
    const onTransition = ({ from, to, event }) => {
      onTransitionSpy.push({ from, to, event });
    };

    machine = await createStateManager({}, {}, onTransition, CLASSIC_BATTLE_STATES);

    const beforeState = machine.getState();
    expect(beforeState).toBe("waitingForMatchStart");

    // Dispatch the startClicked event
    const dispatchResult = await machine.dispatch("startClicked");
    expect(dispatchResult).toBe(true);

    const afterState = machine.getState();
    expect(afterState).toBe("matchStart");

    // Verify transition was recorded
    expect(onTransitionSpy).toContainEqual({
      from: "waitingForMatchStart",
      to: "matchStart",
      event: "startClicked"
    });
  });

  it("should transition from matchStart to roundWait on ready event", async () => {
    const onTransitionSpy = [];
    const onTransition = ({ from, to, event }) => {
      onTransitionSpy.push({ from, to, event });
    };

    machine = await createStateManager({}, {}, onTransition, CLASSIC_BATTLE_STATES);

    // First transition to matchStart
    await machine.dispatch("startClicked");
    expect(machine.getState()).toBe("matchStart");

    // Then transition to roundWait
    const readyResult = await machine.dispatch("ready");
    expect(readyResult).toBe(true);

    const finalState = machine.getState();
    expect(finalState).toBe("roundWait");
  });

  it("should handle onEnter handlers and still maintain correct state", async () => {
    const onEnterCalls = [];
    const onEnterMap = {
      waitingForMatchStart: async () => {
        onEnterCalls.push("waitingForMatchStart");
      },
      matchStart: async () => {
        onEnterCalls.push("matchStart");
      }
    };

    machine = await createStateManager(onEnterMap, {}, undefined, CLASSIC_BATTLE_STATES);

    // Initial state - onEnter should have been called
    expect(onEnterCalls).toContain("waitingForMatchStart");
    expect(machine.getState()).toBe("waitingForMatchStart");

    // Transition to matchStart
    await machine.dispatch("startClicked");
    expect(onEnterCalls).toContain("matchStart");
    expect(machine.getState()).toBe("matchStart");
  });

  it("should maintain state after multiple getState() calls during async operations", async () => {
    machine = await createStateManager({}, {}, undefined, CLASSIC_BATTLE_STATES);

    // Transition to matchStart
    await machine.dispatch("startClicked");

    // State should be updated
    expect(machine.getState()).toBe("matchStart");

    // Multiple calls should all return the same state
    expect(machine.getState()).toBe("matchStart");
    expect(machine.getState()).toBe("matchStart");

    // Verify state persists
    expect(machine.getState()).toBe("matchStart");
  });

  it("should handle empty state table gracefully", async () => {
    machine = await createStateManager({}, {}, undefined, []);

    const state = machine.getState();
    expect(state).toBeDefined();
    // With empty state table, initial state defaults to "waitingForMatchStart"
    expect(state).toBe("waitingForMatchStart");
  });
});
