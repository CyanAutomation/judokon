import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BattleEngine } from "../../src/helpers/BattleEngine.js";

describe("BattleEngine statsUpdated emission", () => {
  let engine;
  beforeEach(() => {
    engine = new BattleEngine();
  });
  afterEach(() => {
    engine = null;
  });

  it("emits statsUpdated after handleStatSelection", () => {
    const handler = vi.fn();
    engine.on("statsUpdated", handler);
    engine.handleStatSelection(5, 3);
    expect(handler).toHaveBeenCalled();
  });

  it("emits statsUpdated after roundModification", () => {
    const handler = vi.fn();
    engine.on("statsUpdated", handler);
    engine.roundModification({ playerScore: 2 });
    expect(handler).toHaveBeenCalled();
  });
});
