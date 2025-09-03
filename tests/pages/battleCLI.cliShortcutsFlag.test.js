import { describe, it, expect, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI cliShortcuts flag", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("does not toggle when cliShortcuts is disabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: false });
    await mod.__test.init();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(true);
  });

  it("toggles when cliShortcuts is enabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: true });
    await mod.__test.init();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(false);
  });
});
