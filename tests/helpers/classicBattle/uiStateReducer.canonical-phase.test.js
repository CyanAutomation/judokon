import { beforeEach, describe, expect, it, vi } from "vitest";

describe("classicBattle canonical state phase mapping", () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="opponent-card" class="opponent-hidden"></div>';
    delete document.body.dataset.battleState;
    delete document.body.dataset.prevBattleState;
    delete document.body.dataset.battlePhase;
    delete document.body.dataset.uiModeClass;
    document.body.removeAttribute("data-battle-state");
    document.body.className = "";

    const { __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
  });

  it("derives grouped phase from canonical target state", async () => {
    const { applyControlStateTransition } = await import(
      "../../../src/helpers/classicBattle/uiStateReducer.js"
    );
    const { phaseFromCanonicalState } = await import(
      "../../../src/helpers/classicBattle/statePhases.js"
    );

    applyControlStateTransition({ from: "roundDisplay", to: "matchEvaluate" });

    expect(phaseFromCanonicalState("matchEvaluate")).toBe("match");
    expect(document.body.dataset.battleState).toBe("matchEvaluate");
    expect(document.body.dataset.battlePhase).toBe("match");
    expect(document.body.classList.contains("battle-mode-matchEvaluate")).toBe(true);
  });

  it("rejects non-canonical pseudo-phase labels for control transitions", async () => {
    const { applyControlStateTransition } = await import(
      "../../../src/helpers/classicBattle/uiStateReducer.js"
    );
    const { onBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");

    const disableSpy = vi.fn();
    onBattleEvent("statButtons:disable", disableSpy);

    applyControlStateTransition({ from: "roundSelect", to: "round" });

    expect(document.body.dataset.battleState).toBeUndefined();
    expect(document.body.dataset.battlePhase).toBeUndefined();
    expect(disableSpy).not.toHaveBeenCalled();
  });

  it("keeps canonical transition authority when detail includes advisory phase", async () => {
    const { applyControlStateTransition } = await import(
      "../../../src/helpers/classicBattle/uiStateReducer.js"
    );

    applyControlStateTransition({
      from: "roundSelect",
      to: "roundResolve",
      phase: "match"
    });

    expect(document.body.dataset.battleState).toBe("roundResolve");
    expect(document.body.dataset.battlePhase).toBe("round");
  });
});
