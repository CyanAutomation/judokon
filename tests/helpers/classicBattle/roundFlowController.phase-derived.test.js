import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/helpers/classicBattle/roundUI.js", () => ({
  handleRoundStartedEvent: vi.fn(async () => {}),
  handleRoundResolvedEvent: vi.fn(async () => {})
}));

describe("roundFlowController canonical phase derivation", () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="opponent-card" class="opponent-hidden"></div>';
    document.body.className = "";
    delete document.body.dataset.battleState;
    delete document.body.dataset.prevBattleState;
    delete document.body.dataset.battlePhase;
    delete document.body.dataset.uiModeClass;

    const { __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
  });

  it("emits state.phaseDerived only from canonical control transitions", async () => {
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );
    const { EVENT_TYPES } = await import("../../../src/helpers/classicBattle/eventCatalog.js");
    const { emitBattleEvent, onBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );

    const phaseSpy = vi.fn();
    onBattleEvent("state.phaseDerived", phaseSpy);

    bindRoundFlowController();

    emitBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, { from: "roundDisplay", to: "matchEvaluate" });
    emitBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, { from: "matchEvaluate", to: "match" });

    expect(phaseSpy).toHaveBeenCalledTimes(1);
    expect(phaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          from: "roundDisplay",
          to: "matchEvaluate",
          phase: "match"
        })
      })
    );
    expect(document.body.dataset.battleState).toBe("matchEvaluate");
    expect(document.body.dataset.battlePhase).toBe("match");
  });
});
