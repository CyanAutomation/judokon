import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateDebugState } from "../../src/helpers/classicBattle/orchestrator.js";

describe("updateDebugState", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete window.__classicBattleState;
    delete window.__classicBattlePrevState;
    delete window.__classicBattleLastEvent;
    delete window.__classicBattleStateLog;
    delete window.__stateWaiters;
  });

  it("mirrors state to DOM and logs transition", () => {
    updateDebugState("a", "b", "go");
    expect(window.__classicBattleState).toBe("b");
    expect(window.__classicBattlePrevState).toBe("a");
    expect(window.__classicBattleLastEvent).toBe("go");
    expect(document.body.dataset.battleState).toBe("b");
    expect(document.body.dataset.prevBattleState).toBe("a");
    const el = document.getElementById("machine-state");
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("b");
    expect(el.dataset.prev).toBe("a");
    expect(el.dataset.event).toBe("go");
    const log = window.__classicBattleStateLog;
    expect(Array.isArray(log)).toBe(true);
    expect(log[log.length - 1]).toMatchObject({
      from: "a",
      to: "b",
      event: "go"
    });
  });

  it("resolves waiters for new state", () => {
    const resolve = vi.fn();
    window.__stateWaiters = { b: [{ resolve }] };
    updateDebugState("a", "b", null);
    expect(resolve).toHaveBeenCalled();
    expect(window.__stateWaiters.b).toEqual([]);
  });
});
