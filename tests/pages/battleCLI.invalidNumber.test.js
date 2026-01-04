import { describe, it, expect, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI invalid number hint", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("shows hint for digits without stats", async () => {
    const mod = await loadBattleCLI({
      battleStats: ["speed", "strength"],
      stats: [
        { statIndex: 1, name: "Speed" },
        { statIndex: 2, name: "Strength" }
      ],
      html: '<div id="player-card"></div>'
    });

    // Import the mocked showSnackbar to verify calls
    const { showSnackbar } = await import("../../src/helpers/showSnackbar.js");

    const keys = ["0", "6"];
    for (const key of keys) {
      showSnackbar.mockClear();
      const handled = mod.handleWaitingForPlayerActionKey(key);
      expect(handled).toBe(true);
      expect(showSnackbar).toHaveBeenCalledWith("Use 1-5, press H for help");
    }
  });
});
