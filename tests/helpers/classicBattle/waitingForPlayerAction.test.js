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
});
