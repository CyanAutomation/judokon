import { describe, it, expect, vi } from "vitest";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";
import {
  emitBattleEvent,
  onBattleEvent,
  offBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { isStateTransition } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

const statesByName = new Map(CLASSIC_BATTLE_STATES.map((s) => [s.name, s]));

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

describe("classic battle state table transitions", () => {
  for (const state of CLASSIC_BATTLE_STATES) {
    if (!Array.isArray(state.triggers)) continue;
    for (const trigger of state.triggers) {
      it(`${state.name} --${trigger.on}--> ${trigger.target}`, async () => {
        document.body.dataset.battleState = "";
        document.body.dataset.prevBattleState = "";
        const spy = vi.fn();
        const onTransition = ({ from, to }) => {
          document.body.dataset.prevBattleState = from || "";
          document.body.dataset.battleState = to;
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
