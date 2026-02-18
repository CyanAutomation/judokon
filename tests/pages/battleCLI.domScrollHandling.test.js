import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI verbose scroll handling", () => {
  beforeEach(async () => {
    await cleanupBattleCLI();
  });

  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("rebinds scroll listener when verbose log element identity changes", async () => {
    const mod = await loadBattleCLI();
    const domMod = await import("../../src/pages/battleCLI/dom.js");

    domMod.ensureVerboseScrollHandling();

    const firstLog = document.getElementById("cli-verbose-log");
    expect(firstLog).toBeTruthy();
    const firstRemoveSpy = vi.spyOn(firstLog, "removeEventListener");

    mod.ensureCliDomForTest({ reset: true });
    const secondLog = document.getElementById("cli-verbose-log");
    expect(secondLog).toBeTruthy();
    expect(secondLog).not.toBe(firstLog);

    expect(firstRemoveSpy).toHaveBeenCalledTimes(1);
    expect(firstRemoveSpy.mock.calls[0]?.[0]).toBe("scroll");

    domMod.ensureVerboseScrollHandling();
    expect(firstRemoveSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps resize listener singular and resettable", async () => {
    await loadBattleCLI();
    const domMod = await import("../../src/pages/battleCLI/dom.js");
    domMod.resetVerboseScrollHandling();

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    domMod.ensureVerboseScrollHandling();
    domMod.ensureVerboseScrollHandling();

    const resizeAddsAfterEnsure = addSpy.mock.calls.filter(([type]) => type === "resize");
    expect(resizeAddsAfterEnsure).toHaveLength(1);

    domMod.resetVerboseScrollHandling();
    domMod.resetVerboseScrollHandling();

    const resizeRemovesAfterReset = removeSpy.mock.calls.filter(([type]) => type === "resize");
    expect(resizeRemovesAfterReset).toHaveLength(1);

    domMod.ensureVerboseScrollHandling();

    const finalResizeAdds = addSpy.mock.calls.filter(([type]) => type === "resize");
    expect(finalResizeAdds).toHaveLength(2);
  });
});
