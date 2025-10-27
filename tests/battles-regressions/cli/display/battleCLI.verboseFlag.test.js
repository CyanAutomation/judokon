import { describe, it, expect, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI verbose flag", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("does not log state changes when cliVerbose is disabled", async () => {
    const mod = await loadBattleCLI({ verbose: false });
    await mod.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { from: "a", to: "b" });
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
  });

  it("logs state changes when cliVerbose is enabled", async () => {
    const mod = await loadBattleCLI({ verbose: true });
    await mod.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { from: "start", to: "end" });
    expect(document.getElementById("cli-verbose-log").textContent).toMatch(/start -> end/);
  });

  it("mirrors the verbose flag in the header indicator", async () => {
    const mod = await loadBattleCLI({ verbose: false });
    await mod.init();
    const indicator = document.getElementById("verbose-indicator");
    expect(indicator).toBeTruthy();
    expect(indicator.style.display).toBe("none");
    expect(indicator.getAttribute("aria-hidden")).toBe("true");

    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await Promise.resolve();
    await Promise.resolve();

    expect(indicator.style.display).toBe("inline");
    expect(indicator.getAttribute("aria-hidden")).toBe("false");
  });
});
