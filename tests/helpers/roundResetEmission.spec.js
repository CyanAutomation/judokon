import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { onBattleEvent, offBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";
import { createBattleStore } from "../../src/helpers/classicBattle/roundManager.js";
import { handleStatSelection } from "../../src/helpers/classicBattle/selectionHandler.js";
import { createBattleEngine } from "../../src/helpers/BattleEngine.js";

describe("roundReset emission", () => {
  let received = [];
  const onReset = (e) => received.push(e?.detail || {});
  beforeEach(() => {
    received = [];
    createBattleEngine();
    onBattleEvent("roundReset", onReset);
  });
  afterEach(() => {
    offBattleEvent("roundReset", onReset);
  });

  it("emits roundReset when player selects a stat", async () => {
    const store = createBattleStore();
    await handleStatSelection(store, "power", { playerVal: 5, opponentVal: 3 });
    expect(received.length).toBeGreaterThan(0);
    expect(received[0]).toHaveProperty("reason", "playerSelection");
  });
});
