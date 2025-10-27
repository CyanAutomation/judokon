import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import {
  emitBattleEvent,
  onBattleEvent,
  offBattleEvent,
  __resetBattleEventTarget
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { domStateListener } from "../../../src/helpers/classicBattle/stateTransitionListeners.js";

beforeEach(() => {
  __resetBattleEventTarget();
  document.body.innerHTML = "";
});

// Generates a state manager scoped to a single transition
async function createMachineForTransition(state, trigger, onTransition) {
  const source = { ...state, triggers: [trigger], type: "initial" };
  const machineStates = [source];
  if (trigger.target !== state.name) {
    const target = CLASSIC_BATTLE_STATES.find((s) => s.name === trigger.target) || {
      name: trigger.target,
      triggers: []
    };
    machineStates.push(target);
  }
  return createStateManager({}, {}, onTransition, machineStates);
}

describe("createStateManager", () => {
  it("initialises with embedded state table", async () => {
    const machine = await createStateManager();
    expect(
      CLASSIC_BATTLE_STATES.length,
      "Classic battle state table should not be empty"
    ).toBeGreaterThan(0);
    const initialState = (
      CLASSIC_BATTLE_STATES.find((s) => s.type === "initial") || CLASSIC_BATTLE_STATES[0]
    ).name;
    expect(machine.getState()).toBe(initialState);
  });
});

describe("classic battle state table transitions", () => {
  for (const state of CLASSIC_BATTLE_STATES) {
    if (!Array.isArray(state.triggers)) continue;
    for (const trigger of state.triggers) {
      it(`${state.name} --${trigger.on}--> ${trigger.target}`, async () => {
        const spy = vi.fn();
        const onTransition = ({ from, to, event }) => {
          emitBattleEvent("battleStateChange", { from, to, event });
        };
        onBattleEvent("battleStateChange", spy);
        onBattleEvent("battleStateChange", domStateListener);
        document.body.dataset.battleState = state.name;
        delete document.body.dataset.prevBattleState;
        const machine = await createMachineForTransition(state, trigger, onTransition);
        await machine.dispatch(trigger.on);
        expect(machine.getState()).toBe(trigger.target);
        expect(spy).toHaveBeenCalled();
        const { battleState, prevBattleState } = document.body.dataset;
        expect(battleState).toBe(trigger.target);
        if (prevBattleState) {
          expect(prevBattleState).toBe(state.name);
        }
        offBattleEvent("battleStateChange", spy);
        offBattleEvent("battleStateChange", domStateListener);
      });
    }
  }
});
