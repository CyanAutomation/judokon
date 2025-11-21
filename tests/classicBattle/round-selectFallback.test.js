// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let battleClassicHtml;
function getBattleClassicHtml() {
  if (!battleClassicHtml) {
    battleClassicHtml = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return battleClassicHtml;
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("Classic Battle round select fallback", () => {
  beforeEach(async () => {
    process.env.VITEST = "true";
    document.documentElement.innerHTML = getBattleClassicHtml();
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

  it("handles fallback retry cycle and cleanup after successful round start", async () => {
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
    expect(startRoundSpy.mock.calls.at(-1)?.[0]).toHaveProperty(
      "__roundSelectFallbackShown",
      false
    );
    expect(store.__roundSelectFallbackShown).not.toBe(true);
    expect(document.getElementById("round-select-fallback")).toBeNull();
    expect(document.getElementById("round-select-error")).toBeNull();
  });

  it("stops retrying fallback start after reaching retry limit", async () => {
    const roundSelectModal = await import("../../src/helpers/classicBattle/roundSelectModal.js");
    const roundManager = await import("../../src/helpers/classicBattle/roundManager.js");
    const uiHelpers = await import("../../src/helpers/classicBattle/uiHelpers.js");
    const { withMutedConsole } = await import("../utils/console.js");

    vi.spyOn(roundSelectModal, "initRoundSelectModal").mockRejectedValueOnce(
      new Error("round select modal failed hard")
    );

    const fatalSpy = vi.spyOn(uiHelpers, "showFatalInitError").mockImplementation(() => {});

    const startRoundSpy = vi
      .spyOn(roundManager, "startRound")
      .mockRejectedValue(new Error("round start keeps failing"));

    const mod = await import("../../src/pages/battleClassic.init.js");

    await withMutedConsole(async () => {
      await mod.init?.();
      await flushMicrotasks();
    });

    const store = typeof window !== "undefined" ? window.battleStore : undefined;
    expect(store).toBeTruthy();

    const fallbackBtn = document.getElementById("round-select-fallback");
    expect(fallbackBtn).toBeTruthy();

    await withMutedConsole(async () => {
      fallbackBtn.click();
      await flushMicrotasks();
    });

    const retryBtn = document.getElementById("round-select-fallback");
    expect(retryBtn).toBeTruthy();

    await withMutedConsole(async () => {
      retryBtn.click();
      await flushMicrotasks();
    });

    expect(fatalSpy).not.toHaveBeenCalled();

    const thirdBtn = document.getElementById("round-select-fallback");
    expect(thirdBtn).toBeTruthy();

    await withMutedConsole(async () => {
      thirdBtn.click();
      await flushMicrotasks();
    });

    expect(startRoundSpy).toHaveBeenCalledTimes(3);
    expect(fatalSpy).not.toHaveBeenCalled();

    const finalBtn = document.getElementById("round-select-fallback");
    expect(finalBtn).toBeTruthy();

    await withMutedConsole(async () => {
      finalBtn.click();
      await flushMicrotasks();
    });

    expect(startRoundSpy).toHaveBeenCalledTimes(4);
    expect(fatalSpy).toHaveBeenCalledTimes(1);
    expect(document.getElementById("round-select-fallback")).toBeNull();
    expect(document.getElementById("round-select-error")).toBeNull();
  });
});
