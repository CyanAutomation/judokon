import { describe, it, expect, beforeEach, vi } from "vitest";

describe("waitingForPlayerActionEnter", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    const next = document.createElement("button");
    next.id = "next-button";
    next.setAttribute("data-role", "next-round");
    next.disabled = true;
    document.body.appendChild(next);
  });

  it("does not mark Next as ready during stat selection", async () => {
    const mod = await import("../../../src/helpers/classicBattle/orchestratorHandlers.js");
    const store = {};
    const machine = { context: { store } };
    await mod.waitingForPlayerActionEnter(machine);
    const btn = document.querySelector('[data-role="next-round"]');
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
  });

  it("clears stale selection flags when re-entered after rapid transitions", async () => {
    const mod = await import(
      "../../../src/helpers/classicBattle/stateHandlers/waitingForPlayerActionEnter.js"
    );
    const store = {
      selectionMade: true,
      __lastSelectionMade: true,
      playerChoice: "speed"
    };
    const machine = { context: { store }, currentState: "cooldown" };

    await mod.waitingForPlayerActionEnter(machine);

    expect(store.selectionMade).toBe(false);
    expect(store.__lastSelectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
  });
});
