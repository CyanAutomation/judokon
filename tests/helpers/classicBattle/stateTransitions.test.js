import { describe, it, expect } from "vitest";
import classicBattleStates from "../../../src/data/classicBattleStates.json" with { type: "json" };
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";

const statesByName = new Map(classicBattleStates.map((s) => [s.name, s]));

// Generates a BattleStateMachine scoped to a single transition
function createMachineForTransition(state, trigger) {
  const source = { ...state, triggers: [trigger] };
  const machineStates = new Map([[state.name, source]]);
  if (trigger.target !== state.name) {
    machineStates.set(
      trigger.target,
      statesByName.get(trigger.target) || { name: trigger.target, triggers: [] }
    );
  }
  return new BattleStateMachine(machineStates, state.name, {});
}

describe("classicBattleStates.json transitions", () => {
  for (const state of classicBattleStates) {
    if (!Array.isArray(state.triggers)) continue;
    for (const trigger of state.triggers) {
      it(`${state.name} --${trigger.on}--> ${trigger.target}`, async () => {
        const machine = createMachineForTransition(state, trigger);
        await machine.dispatch(trigger.on);
        expect(machine.getState()).toBe(trigger.target);
      });
    }
  }
});
