import { describe, it, expect, vi } from "vitest";
import classicBattleStates from "../../../src/data/classicBattleStates.json" with { type: "json" };
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";
import {
  emitBattleEvent,
  onBattleEvent,
  offBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { isStateTransition } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

const statesByName = new Map(classicBattleStates.map((s) => [s.name, s]));

// Generates a BattleStateMachine scoped to a single transition
function createMachineForTransition(state, trigger, onTransition) {
  const source = { ...state, triggers: [trigger] };
  const machineStates = new Map([[state.name, source]]);
  if (trigger.target !== state.name) {
    machineStates.set(
      trigger.target,
      statesByName.get(trigger.target) || { name: trigger.target, triggers: [] }
    );
  }
  return new BattleStateMachine(machineStates, state.name, {}, {}, onTransition);
}

describe("classicBattleStates.json transitions", () => {
  for (const state of classicBattleStates) {
    if (!Array.isArray(state.triggers)) continue;
    for (const trigger of state.triggers) {
      it(`${state.name} --${trigger.on}--> ${trigger.target}`, async () => {
        delete window.__classicBattleState;
        delete window.__classicBattlePrevState;
        const spy = vi.fn();
        const onTransition = ({ from, to }) => {
          window.__classicBattlePrevState = from;
          window.__classicBattleState = to;
          emitBattleEvent("debugPanelUpdate");
        };
        onBattleEvent("debugPanelUpdate", spy);
        const machine = createMachineForTransition(state, trigger, onTransition);
        await machine.dispatch(trigger.on);
        expect(machine.getState()).toBe(trigger.target);
        expect(spy).toHaveBeenCalled();
        expect(isStateTransition(state.name, trigger.target)).toBe(true);
        offBattleEvent("debugPanelUpdate", spy);
      });
    }
  }
});
