import { describe, it, expect, vi, beforeEach } from "vitest";

describe("battleStateProgress updates on object-shaped battle:state", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="battle-state-progress"></ul>
      <div id="battle-state-badge"></div>
    `;
  });

  it("renders list and marks active on {from,to}", async () => {
    const mod = await import("../../../src/helpers/battleStateProgress.js");
    await mod.initBattleStateProgress();

    // Simulate an initial render; the list should contain core states
    const list = document.getElementById("battle-state-progress");
    expect(list.children.length).toBeGreaterThan(0);

    // Dispatch an object-shaped event and verify the active item toggles.
    document.dispatchEvent(new CustomEvent("battle:state", { detail: { from: "x", to: "cooldown" } }));
    const active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("cooldown");

    // Badge also updates
    const badge = document.getElementById("battle-state-badge");
    expect(badge.textContent).toBe("State: cooldown");
  });
});

