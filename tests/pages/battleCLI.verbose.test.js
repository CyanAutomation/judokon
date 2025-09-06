import { describe, it, expect, afterEach, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI verbose flag", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
    vi.unstubAllGlobals();
  });

  it("enables verbose mode via query param without console noise", async () => {
    const mod = await loadBattleCLI({ url: "http://localhost/?verbose=1" });
    await withMutedConsole(async () => {
      await mod.init();
      mod.handleBattleState({ detail: { from: "init", to: "waiting" } });
    }, ["info"]);
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    expect(setFlag).toHaveBeenCalledWith("cliVerbose", true);
    expect(document.getElementById("cli-verbose-section").hidden).toBe(false);
  });
});
