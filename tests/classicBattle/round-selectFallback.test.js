import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const battleClassicHtml = readFileSync(
  resolve(process.cwd(), "src/pages/battleClassic.html"),
  "utf-8"
);

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("Classic Battle round select fallback", () => {
  beforeEach(async () => {
    process.env.VITEST = "true";
    document.documentElement.innerHTML = battleClassicHtml;
    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    if (typeof window !== "undefined") {
      delete window.battleStore;
      if (window.__classicBattleRetryListener && window.removeEventListener) {
        try {
          window.removeEventListener("battle.cardRetry", window.__classicBattleRetryListener);
        } catch {}
      }
      delete window.__classicBattleRetryListener;
    }
  });

  it("resets fallback tracking after successful retry", async () => {
    const roundSelectModal = await import("../../src/helpers/classicBattle/roundSelectModal.js");
    const roundManager = await import("../../src/helpers/classicBattle/roundManager.js");
    const { withMutedConsole } = await import("../utils/console.js");

    vi.spyOn(roundSelectModal, "initRoundSelectModal").mockRejectedValueOnce(
      new Error("round select modal failed")
    );

    const startRoundSpy = vi
      .spyOn(roundManager, "startRound")
      .mockRejectedValueOnce(new Error("round start failed"))
      .mockResolvedValue(undefined);

    const mod = await import("../../src/pages/battleClassic.init.js");

    await withMutedConsole(async () => {
      await mod.init?.();
      await flushMicrotasks();
    });

    const store = typeof window !== "undefined" ? window.battleStore : undefined;
    expect(store).toBeTruthy();

    let fallbackBtn = document.getElementById("round-select-fallback");
    expect(fallbackBtn).toBeTruthy();

    await withMutedConsole(async () => {
      fallbackBtn.click();
      await flushMicrotasks();
    });

    expect(startRoundSpy).toHaveBeenCalledTimes(1);
    fallbackBtn = document.getElementById("round-select-fallback");
    expect(fallbackBtn).toBeTruthy();
    expect(document.querySelectorAll("#round-select-fallback")).toHaveLength(1);

    await withMutedConsole(async () => {
      fallbackBtn.click();
      await flushMicrotasks();
    });

    expect(startRoundSpy).toHaveBeenCalledTimes(2);
    expect(store.__roundSelectFallbackShown).not.toBe(true);
    expect(document.getElementById("round-select-fallback")).toBeNull();
    expect(document.getElementById("round-select-error")).toBeNull();
  });
});
