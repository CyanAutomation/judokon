import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CLASSIC_BATTLE_STATES, GUARD_CONDITIONS } from "../../../src/helpers/classicBattle/stateTable.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import * as featureFlags from "../../../src/helpers/featureFlags.js";
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

afterEach(() => {
  vi.resetAllMocks();
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

  // Build context to support guard evaluation
  let context = {};

  // For WIN_CONDITION_MET guard, provide a mock engine that satisfies the condition
  if (trigger.guard === GUARD_CONDITIONS.WIN_CONDITION_MET) {
    context.engine = {
      getScores: () => ({ playerScore: 3, opponentScore: 0 }),
      pointsToWin: 3
    };
  }

  // For feature flag guards, mock isEnabled to return appropriate value
  if (trigger.guard === GUARD_CONDITIONS.AUTO_SELECT_DISABLED) {
    // Guard is "!autoSelectEnabled", so we want autoSelect to be false (disabled)
    vi.spyOn(featureFlags, "isEnabled").mockReturnValue(false);
  } else if (trigger.guard === GUARD_CONDITIONS.FF_ROUND_MODIFY) {
    // Guard is "FF_ROUND_MODIFY", so we want roundModify to be true (enabled)
    vi.spyOn(featureFlags, "isEnabled").mockImplementation((flag) => {
      if (flag === "roundModify") return true;
      return false;
    });
  }

  return createStateManager({}, context, onTransition, machineStates);
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
