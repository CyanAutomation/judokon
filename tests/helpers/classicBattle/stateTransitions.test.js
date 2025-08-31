import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";
import {
  emitBattleEvent,
  onBattleEvent,
  offBattleEvent,
  __resetBattleEventTarget
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { domStateListener } from "../../../src/helpers/classicBattle/stateTransitionListeners.js";
import { isStateTransition } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

const statesByName = new Map(CLASSIC_BATTLE_STATES.map((s) => [s.name, s]));

beforeEach(() => {
  __resetBattleEventTarget();
  document.body.innerHTML = "";
});

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

describe("BattleStateMachine.create", () => {
  it("initialises with embedded state table", async () => {
    const machine = await BattleStateMachine.create();
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
        const machine = createMachineForTransition(state, trigger, onTransition);
        await machine.dispatch(trigger.on);
        expect(machine.getState()).toBe(trigger.target);
        expect(spy).toHaveBeenCalled();
        expect(isStateTransition(state.name, trigger.target)).toBe(true);
        offBattleEvent("battleStateChange", spy);
        offBattleEvent("battleStateChange", domStateListener);
      });
    }
  }
});
