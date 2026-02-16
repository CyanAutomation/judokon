import { describe, it, expect } from "vitest";
import "./commonMocks.js";
import { withMutedConsole } from "../../utils/console.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { onBattleEvent, offBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

function createNoopOnEnterMap() {
  return {
    waitingForMatchStart: async () => {},
    matchStart: async () => {},
    roundWait: async () => {},
    roundPrompt: async () => {},
    roundSelect: async () => {},
    roundResolve: async () => {},
    roundDisplay: async () => {},
    matchEvaluate: async () => {},
    matchDecision: async () => {},
    matchOver: async () => {},
    interruptRound: async () => {},
    interruptMatch: async () => {}
  };
}

describe("stateManager projection authority", () => {
  it("reconciles conflicting UI projection writes during transitions", async () => {
    const store = {
      selectionMade: true,
      playerChoice: "speed",
      roundReadyForInput: true
    };
    const events = [];
    const onRejected = (event) => events.push(event.detail);
    onBattleEvent("battle.intent.rejected", onRejected);

    try {
      const machine = await withMutedConsole(() =>
        createStateManager(createNoopOnEnterMap(), { store })
      );

      await machine.dispatch("startClicked");

      expect(machine.getState()).toBe("matchStart");
      expect(store.selectionMade).toBe(false);
      expect(store.playerChoice).toBeNull();
      expect(store.roundReadyForInput).toBe(false);
      expect(events.some((entry) => entry?.reason === "projection.desync.rejected")).toBe(true);
    } finally {
      offBattleEvent("battle.intent.rejected", onRejected);
    }
  });

  it("keeps roundSelect projection aligned with orchestrator authority", async () => {
    const store = {
      selectionMade: false,
      playerChoice: null,
      roundReadyForInput: false
    };

    const machine = await createStateManager(createNoopOnEnterMap(), { store });

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    expect(machine.getState()).toBe("roundSelect");
    expect(store.roundReadyForInput).toBe(true);

    store.roundReadyForInput = false;
    await machine.dispatch("statSelected");

    expect(machine.getState()).toBe("roundResolve");
    expect(store.roundReadyForInput).toBe(false);
  });
});
