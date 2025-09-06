import { describe, it, expect, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI verbose toggle", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("shows verbose section and logs after enabling mid-match", async () => {
    const mod = await loadBattleCLI();
    await mod.__test.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    const section = document.getElementById("cli-verbose-section");
    const pre = document.getElementById("cli-verbose-log");
    emitBattleEvent("battleStateChange", { from: "a", to: "b" });
    expect(section.hidden).toBe(true);
    expect(pre.textContent).toBe("");
    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await Promise.resolve();
    emitBattleEvent("battleStateChange", { from: "c", to: "d" });
    expect(section.hidden).toBe(false);
    expect(pre.textContent).toMatch(/c -> d/);
  });
});
