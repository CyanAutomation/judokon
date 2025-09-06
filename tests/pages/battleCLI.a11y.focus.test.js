import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI accessibility", () => {
  describe("focus management", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(async () => {
      vi.useRealTimers();
      await cleanupBattleCLI();
    });

    it("shifts focus between stat list and next prompt", async () => {
      const mod = await loadBattleCLI();
      await mod.init();
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
      expect(document.activeElement?.id).toBe("cli-stats");
      const { setAutoContinue } = await import(
        "../../src/helpers/classicBattle/orchestratorHandlers.js"
      );
      setAutoContinue(false);
      emitBattleEvent("battleStateChange", { to: "roundOver" });
      const bar = document.querySelector("#snackbar-container .snackbar");
      expect(bar?.textContent).toBe("Press Enter to continue");
      const nextButton = document.getElementById("next-round-button");
      expect(document.activeElement).toBe(nextButton);
    });

    it("navigates stat rows with arrow keys and wraps", async () => {
      const mod = await loadBattleCLI({
        battleStats: ["speed", "power", "technique"],
        stats: [
          { statIndex: 1, name: "Speed" },
          { statIndex: 2, name: "Power" },
          { statIndex: 3, name: "Technique" }
        ]
      });
      await mod.init();
      const list = document.getElementById("cli-stats");
      const rows = Array.from(list.querySelectorAll(".cli-stat"));
      expect(rows[0].tabIndex).toBe(0);
      expect(rows[1].tabIndex).toBe(-1);
      list.focus();
      const { onKeyDown } = await import("../../src/pages/index.js");
      onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[0]);
      onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[1]);
      onKeyDown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(document.activeElement).toBe(rows[0]);
      onKeyDown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(document.activeElement).toBe(rows[2]);
      onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(document.activeElement).toBe(rows[0]);
      expect(list.getAttribute("aria-activedescendant")).toBe(rows[0].id);
    });
  });
});
