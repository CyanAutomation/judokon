import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../../utils/console.js";

describe("battleCLI init import guards", () => {
  it("does not throw when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await expect(import("../../../src/pages/battleCLI/init.js")).resolves.toBeTruthy();
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });

  it("handles game:reset-ui dispatch when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await import("../../../src/pages/battleCLI/init.js");
        if (typeof window !== "undefined") {
          const dispatchSpy = vi.spyOn(window, "dispatchEvent");
          const testEvent = new CustomEvent("game:reset-ui", { detail: { store: null } });
          expect(() => {
            window.dispatchEvent(testEvent);
          }).not.toThrow();
          expect(dispatchSpy).toHaveBeenCalledWith(testEvent);
          dispatchSpy.mockRestore();
        }
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });

  it("skips DOM-only boot work when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      vi.doMock("../../../src/helpers/setupScoreboard.js", async () => {
        const actual = await vi.importActual("../../../src/helpers/setupScoreboard.js");
        return { ...actual, setupScoreboard: vi.fn() };
      });
      vi.doMock("../../../src/helpers/battleScoreboard.js", async () => {
        const actual = await vi.importActual("../../../src/helpers/battleScoreboard.js");
        return { ...actual, initBattleScoreboardAdapter: vi.fn() };
      });

      await withMutedConsole(async () => {
        await import("../../../src/pages/battleCLI/init.js");
      });

      const scoreboardModule = await import("../../../src/helpers/setupScoreboard.js");
      const battleScoreboardModule = await import("../../../src/helpers/battleScoreboard.js");
      expect(scoreboardModule.setupScoreboard).not.toHaveBeenCalled();
      expect(battleScoreboardModule.initBattleScoreboardAdapter).not.toHaveBeenCalled();
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });
});
