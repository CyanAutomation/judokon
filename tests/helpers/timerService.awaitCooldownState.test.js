import { describe, it, expect, vi, beforeEach } from "vitest";
import { awaitCooldownState } from "../../src/helpers/classicBattle/awaitCooldownState.js";

describe("awaitCooldownState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves immediately when cooldown active", async () => {
    window.__classicBattleState = "cooldown";
    await expect(awaitCooldownState()).resolves.toBeUndefined();
  });

  it("waits for cooldown when in roundOver", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.__classicBattleState = "roundOver";
    const p = awaitCooldownState();
    document.dispatchEvent(new CustomEvent("battle:state", { detail: { to: "cooldown" } }));
    await expect(p).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("waits for cooldown when pre-cooldown", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.__classicBattleState = "roundDecision";
    const p = awaitCooldownState();
    document.dispatchEvent(new CustomEvent("battle:state", { detail: { to: "cooldown" } }));
    await expect(p).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
